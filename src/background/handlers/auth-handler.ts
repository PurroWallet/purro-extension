import { STORAGE_KEYS } from "../constants/storage-keys";
import { encryption } from "../lib/encryption";
import { SessionData } from "../types/storage";
import { storageHandler } from "./storage-handler";

let session: SessionData | null = null;

export const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours max
export const MIN_TIMEOUT = 5 * 60 * 1000; // 5 minutes min

export const authHandler = {
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
    },

    async unlock(password: string): Promise<void> {
        const passwordStored = await storageHandler.getStoredPassword();

        if (!passwordStored) {
            throw new Error("Password not found");
        }

        const isValidPassword = await encryption.verifyPassword(password, passwordStored.data, passwordStored.salt);
        if (!isValidPassword) {
            throw new Error("Invalid password");
        }

        const timeout = await this.getSessionTimeout();

        session = {
            password: password,
            timestamp: Date.now(),
            expiresAt: Date.now() + timeout
        };
    },

    async lock(): Promise<void> {
        // Clear sensitive data from memory for security
        if (session?.password) {
            session.password = ''; // Overwrite password string
        }
        session = null;
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