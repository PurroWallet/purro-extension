import { authHandler } from "../handlers/auth-handler";
import { storageHandler } from "../handlers/storage-handler";
import { encryption } from "../lib/encryption";

export interface AuthValidationResult {
    password: string;
    isFromSession: boolean;
}

export const authValidator = {
    /**
 * Validate authentication and get password
 * If password is provided, validate it against stored password (or save it if no stored password exists)
 * If password is not provided, get it from current session
 */
    async validateAndGetPassword(providedPassword?: string): Promise<AuthValidationResult> {
        if (providedPassword) {
            const passwordStored = await storageHandler.getStoredPassword();

            if (!passwordStored) {
                // No password stored yet, save the provided password and create session
                await authHandler.importPassword({ password: providedPassword });

                return {
                    password: providedPassword,
                    isFromSession: false
                };
            } else {
                // Validate provided password against stored password
                const isValidPassword = await encryption.verifyPassword(
                    providedPassword,
                    passwordStored.data,
                    passwordStored.salt
                );

                if (!isValidPassword) {
                    throw new Error("Invalid password");
                }

                return {
                    password: providedPassword,
                    isFromSession: false
                };
            }
        } else {
            // Get password from session
            const session = await authHandler.getSession();
            if (!session) {
                throw new Error("Session not unlocked. Please unlock your wallet or provide password.");
            }

            return {
                password: session.password,
                isFromSession: true
            };
        }
    },

    /**
     * Ensure session is unlocked
     */
    async requireUnlockedSession(): Promise<string> {
        const session = await authHandler.getSession();
        if (!session) {
            throw new Error("Session not unlocked. Please unlock your wallet first.");
        }
        return session.password;
    },

    /**
     * Validate password without requiring session
     */
    async validatePassword(password: string): Promise<boolean> {
        const passwordStored = await storageHandler.getStoredPassword();
        if (!passwordStored) {
            throw new Error("No password found");
        }

        return await encryption.verifyPassword(password, passwordStored.data, passwordStored.salt);
    },

    /**
     * Check if wallet has been initialized (password exists)
     */
    async isWalletInitialized(): Promise<boolean> {
        const passwordStored = await storageHandler.getStoredPassword();
        return passwordStored !== null;
    },

    /**
     * Initialize wallet with password if not already initialized
     */
    async initializeWalletIfNeeded(password: string): Promise<void> {
        const isInitialized = await this.isWalletInitialized();
        if (!isInitialized) {
            await authHandler.importPassword({ password });
        }
    }
}; 