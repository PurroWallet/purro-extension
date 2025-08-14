import { STORAGE_KEYS } from '../constants/storage-keys';
import { encryption } from '../lib/encryption';
import { SessionData } from '../types/storage';
import { storageHandler } from './storage-handler';
import { offscreenManager } from '../lib/offscreen-manager';

export const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours max
export const MIN_TIMEOUT = 5 * 60 * 1000; // 5 minutes min

export const authHandler = {
  // Utility: schedule automatic lock via Chrome alarms
  scheduleAutoLock(timeoutMs: number) {
    try {
      // Clear any existing auto-lock alarm first
      chrome.alarms.clear('AUTO_LOCK');
      chrome.alarms.create('AUTO_LOCK', { when: Date.now() + timeoutMs });
    } catch (e) {
      console.warn('Unable to schedule auto-lock alarm', e);
    }
  },

  // Read
  async getSession(): Promise<SessionData | null> {
    try {
      const session = await offscreenManager.sendToOffscreen('GET_SESSION');

      console.log('session', session);

      // Auto-lock expired sessions
      if (session && session.expiresAt <= Date.now()) {
        await this.lock();
        return null;
      }
      return session;
    } catch (error) {
      console.warn('Failed to get secure session:', error);
      // Force lock state when session is not accessible
      await chrome.storage.local.set({
        [STORAGE_KEYS.SESSION_IS_LOCKED]: true,
      });
      return null;
    }
  },

  async getSessionTimeout(): Promise<number> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.SESSION_TIMEOUT,
    ]);
    return result[STORAGE_KEYS.SESSION_TIMEOUT] || DEFAULT_TIMEOUT;
  },

  // Write
  async setSessionTimeout(timeout: number): Promise<void> {
    if (timeout < MIN_TIMEOUT || timeout > MAX_TIMEOUT) {
      throw new Error('Timeout must be between 5 minutes and 24 hours');
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_TIMEOUT]: timeout });

    // If a session is currently active we need to update its expiry and reschedule
    // the auto-lock alarm so the new timeout takes effect immediately.
    try {
      const session = await offscreenManager.sendToOffscreen('GET_SESSION');
      if (session) {
        session.expiresAt = Date.now() + timeout;
        await offscreenManager.sendToOffscreen('SET_SESSION', session);
        this.scheduleAutoLock(timeout);
      }
    } catch (error) {
      console.warn(
        'Failed to update session timeout - session may have been lost'
      );
    }
  },

  async importPassword(data: { password: string }): Promise<void> {
    const passwordEncrypted = await encryption.hashPassword(data.password);
    await storageHandler.savePassword(passwordEncrypted);
    const timeout = await this.getSessionTimeout();

    const sessionData: SessionData = {
      password: data.password,
      timestamp: Date.now(),
      expiresAt: Date.now() + timeout,
    };

    // This will throw if offscreen is not available - FAIL SECURELY
    await offscreenManager.sendToOffscreen('SET_SESSION', sessionData);

    // Wallet is now unlocked
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_IS_LOCKED]: false });

    // Schedule automatic lock
    this.scheduleAutoLock(timeout);
  },

  async unlock(data: { password: string }): Promise<void> {
    const passwordStored = await storageHandler.getStoredPassword();

    if (!passwordStored || !passwordStored.data || !passwordStored.salt) {
      throw new Error('Password storage corrupted or not found');
    }

    const isValidPassword = await encryption.verifyPassword(
      data.password,
      passwordStored.data,
      passwordStored.salt
    );

    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    const timeout = await this.getSessionTimeout();

    const sessionData: SessionData = {
      password: data.password,
      timestamp: Date.now(),
      expiresAt: Date.now() + timeout,
    };

    // This will throw if offscreen is not available - FAIL SECURELY
    await offscreenManager.sendToOffscreen('SET_SESSION', sessionData);

    // Persist lock state for other extension contexts
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_IS_LOCKED]: false });

    // Schedule automatic lock
    this.scheduleAutoLock(timeout);
  },

  async lock(): Promise<void> {
    try {
      // Clear session in offscreen document with secure cleanup
      await offscreenManager.sendToOffscreen('CLEAR_SESSION');

      // Close offscreen document to ensure complete memory cleanup
      await offscreenManager.closeOffscreenDocument();
    } catch (error) {
      console.warn('Error during secure session cleanup:', error);
      // Still proceed with lock state update
    }

    // Clear auto-lock alarm
    try {
      chrome.alarms.clear('AUTO_LOCK');
    } catch (e) {
      console.warn('Unable to clear auto-lock alarm', e);
    }

    // Update lock state flag in storage so UI can react
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_IS_LOCKED]: true });
  },

  async isUnlocked(): Promise<boolean> {
    const currentSession = await this.getSession(); // Will auto-lock if expired or unavailable
    return currentSession !== null;
  },

  async getPassword(): Promise<string | null> {
    const currentSession = await this.getSession(); // Will auto-lock if expired or unavailable
    return currentSession?.password || null;
  },
};
