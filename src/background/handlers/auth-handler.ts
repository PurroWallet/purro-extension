import { STORAGE_KEYS } from "../constants/storage-keys";
import { encryption } from "../lib/encryption";
import { SessionData } from "../types/storage";
import { storageHandler } from "./storage-handler";

let session: SessionData | null = null;

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
        // Auto-lock expired sessions
        if (session && session.expiresAt <= Date.now()) {
            await this.lock();
            return null;
        }
        return session;
    },

    async getSessionTimeout(): Promise<number> {
        const result = await chrome.storage.local.get([STORAGE_KEYS.SESSION_TIMEOUT]);
        return result[STORAGE_KEYS.SESSION_TIMEOUT] || DEFAULT_TIMEOUT;
    },

    // Write
    async setSessionTimeout(timeout: number): Promise<void> {
        if (timeout < MIN_TIMEOUT || timeout > MAX_TIMEOUT) {
            throw new Error("Timeout must be between 5 minutes and 24 hours");
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_TIMEOUT]: timeout });
    },

    async importPassword(data: { password: string }): Promise<void> {
        const passwordEncrypted = await encryption.hashPassword(data.password);
        await storageHandler.savePassword(passwordEncrypted);
        const timeout = await this.getSessionTimeout();

        session = {
            password: data.password,
            timestamp: Date.now(),
            expiresAt: Date.now() + timeout
        };

        // Wallet is now unlocked
        await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_IS_LOCKED]: false });

        // Schedule automatic lock
        this.scheduleAutoLock(timeout);
    },

    async unlock(data: { password: string }): Promise<void> {
        const passwordStored = await storageHandler.getStoredPassword();

        if (!passwordStored || !passwordStored.data || !passwordStored.salt) {
            throw new Error("Password storage corrupted or not found");
        }

        const isValidPassword = await encryption.verifyPassword(
            data.password,
            passwordStored.data,
            passwordStored.salt
        );

        if (!isValidPassword) {
            throw new Error("Invalid password");
        }

        const timeout = await this.getSessionTimeout();

        session = {
            password: data.password,
            timestamp: Date.now(),
            expiresAt: Date.now() + timeout
        };

        // Persist lock state for other extension contexts
        await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_IS_LOCKED]: false });

        // Schedule automatic lock
        this.scheduleAutoLock(timeout);
    },

    async lock(): Promise<void> {
        if (session?.password) {
            // Overwrite multiple times
            const len = session.password.length;
            session.password = '0'.repeat(len);
            session.password = '1'.repeat(len);
            session.password = crypto.getRandomValues(new Uint8Array(len)).join('');
            session.password = '';
        }
        session = null;

        // Force garbage collection if possible
        if (global.gc) global.gc();

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
        const currentSession = await this.getSession(); // Will auto-lock if expired
        return currentSession !== null;
    },

    async getPassword(): Promise<string | null> {
        const currentSession = await this.getSession(); // Will auto-lock if expired
        return currentSession?.password || null;
    },
}