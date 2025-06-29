import { DataEncryption } from "@/background/types/account";
import { PasswordData } from "../types/storage";

// Constants
const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 12;
const KDF = 'PBKDF2';
const PASSWORD_SALT_LENGTH = 32;

// Minimum security requirements
const MIN_PASSWORD_LENGTH = 8;
const MIN_ITERATIONS = 100000;

// Utility functions
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): Uint8Array => {
    try {
        return new Uint8Array(
            atob(base64).split('').map(c => c.charCodeAt(0))
        );
    } catch (error) {
        throw new Error('Invalid base64 string');
    }
};

// Validation functions
const validatePassword = (password: string): void => {
    if (!password) {
        throw new Error('Password is required');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
};

const validateEncryptionData = (data: DataEncryption): void => {
    const requiredFields = ['digest', 'encrypted', 'iterations', 'kdf', 'nonce', 'salt'];
    for (const field of requiredFields) {
        if (!data[field as keyof DataEncryption]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    if (data.iterations < MIN_ITERATIONS) {
        throw new Error(`Insufficient iterations: minimum ${MIN_ITERATIONS} required`);
    }
};

export const encryption = {
    /**
     * Encrypts data using AES-GCM with PBKDF2 key derivation
     */
    encrypt: async (
        data: string,
        password: string
    ): Promise<DataEncryption> => {
        if (!data) {
            throw new Error('Data is required');
        }
        validatePassword(password);

        try {
            const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
            const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: nonce },
                key,
                new TextEncoder().encode(data)
            );

            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));

            return {
                digest: arrayBufferToBase64(digest),
                encrypted: arrayBufferToBase64(encrypted),
                iterations: ITERATIONS,
                kdf: KDF,
                nonce: arrayBufferToBase64(nonce.buffer),
                salt: arrayBufferToBase64(salt.buffer)
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${(error as Error).message}`);
        }
    },

    /**
     * Decrypts data and verifies integrity
     */
    decrypt: async (
        encryptedData: DataEncryption,
        password: string
    ): Promise<string> => {
        validatePassword(password);
        validateEncryptionData(encryptedData);

        try {
            const salt = base64ToArrayBuffer(encryptedData.salt);
            const nonce = base64ToArrayBuffer(encryptedData.nonce);
            const encrypted = base64ToArrayBuffer(encryptedData.encrypted);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: encryptedData.iterations,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: nonce },
                key,
                encrypted
            );

            const decryptedText = new TextDecoder().decode(decrypted);

            // Verify data integrity
            const computedDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(decryptedText));
            const computedDigestB64 = arrayBufferToBase64(computedDigest);

            if (computedDigestB64 !== encryptedData.digest) {
                throw new Error('Data integrity verification failed');
            }

            return decryptedText;
        } catch (error) {
            if (error instanceof Error && error.message.includes('integrity')) {
                throw error; // Re-throw integrity errors as-is
            }
            throw new Error(`Decryption failed: ${(error as Error).message}`);
        }
    },

    /**
     * Hashes password using PBKDF2 with SHA-256
     */
    hashPassword: async (password: string, salt?: Uint8Array): Promise<PasswordData> => {
        validatePassword(password);

        try {
            const passwordSalt = salt || crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_LENGTH));

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );

            const hashBuffer = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: passwordSalt,
                    iterations: ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                256
            );

            return {
                data: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))),
                salt: btoa(String.fromCharCode(...passwordSalt))
            };
        } catch (error) {
            throw new Error(`Password hashing failed: ${(error as Error).message}`);
        }
    },

    /**
     * Verifies password against stored hash
     */
    verifyPassword: async (password: string, storedHash: string, storedSalt: string): Promise<boolean> => {
        if (!password || !storedHash || !storedSalt) {
            return false;
        }

        try {
            const salt = new Uint8Array(atob(storedSalt).split('').map(c => c.charCodeAt(0)));
            const { data } = await encryption.hashPassword(password, salt);
            return data === storedHash;
        } catch (error) {
            // Log error for debugging but don't throw - return false for security
            console.error('Password verification error:', error);
            return false;
        }
    },

    /**
     * Hashes arbitrary data using SHA-256
     */
    hashData: async (data: string): Promise<string> => {
        if (!data) {
            throw new Error('Data is required');
        }

        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            return arrayBufferToBase64(hashBuffer);
        } catch (error) {
            throw new Error(`Data hashing failed: ${(error as Error).message}`);
        }
    },

    /**
     * Generates a secure random salt
     */
    generateSalt: (length: number = SALT_LENGTH): Uint8Array => {
        if (length <= 0) {
            throw new Error('Salt length must be positive');
        }
        return crypto.getRandomValues(new Uint8Array(length));
    },

    /**
     * Generates a secure random nonce
     */
    generateNonce: (length: number = NONCE_LENGTH): Uint8Array => {
        if (length <= 0) {
            throw new Error('Nonce length must be positive');
        }
        return crypto.getRandomValues(new Uint8Array(length));
    },

    /**
     * Validates password strength
     */
    validatePasswordStrength: (password: string): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (password.length < MIN_PASSWORD_LENGTH) {
            errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Securely compares two strings to prevent timing attacks
     */
    secureCompare: (a: string, b: string): boolean => {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }
};