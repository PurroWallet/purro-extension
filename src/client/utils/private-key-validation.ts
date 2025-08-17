import { ethers } from 'ethers';

// Constants for easy customization
const VALIDATION_CONFIG = {
    EVM_CHAINS: ['ethereum', 'hyperevm', 'base', 'arbitrum'],
    ERROR_MESSAGES: {
        INVALID_PRIVATE_KEY: 'Invalid private key. Please try again.',
        ALREADY_IMPORTED: 'This private key is already imported.',
    },
} as const;

export interface PrivateKeyValidationResult {
    isValid: boolean;
    address: string;
}

/**
 * Validates a private key for the specified chain and returns the corresponding address
 * @param privateKeyValue - The private key to validate
 * @param chain - The blockchain network (ethereum, hyperevm, base, arbitrum, solana, sui)
 * @returns Object with validation result and address
 */
export const validatePrivateKeyFormat = (
    privateKeyValue: string,
    chain: string | null
): PrivateKeyValidationResult => {
    if (!privateKeyValue.trim() || !chain) {
        return { isValid: false, address: '' };
    }

    try {
        if (
            VALIDATION_CONFIG.EVM_CHAINS.includes(
                chain as (typeof VALIDATION_CONFIG.EVM_CHAINS)[number]
            )
        ) {
            return validateEvmPrivateKey(privateKeyValue);
        } else if (chain === 'solana') {
            return validateSolanaPrivateKey(privateKeyValue);
        } else if (chain === 'sui') {
            return validateSuiPrivateKey(privateKeyValue);
        }

        return { isValid: false, address: '' };
    } catch (error) {
        console.error('Private key validation error:', error);
        return { isValid: false, address: '' };
    }
};

/**
 * Validates an EVM private key using ethers library
 */
const validateEvmPrivateKey = (privateKeyValue: string): PrivateKeyValidationResult => {
    try {
        // Check basic format first
        let cleanPrivateKey = privateKeyValue;
        if (privateKeyValue.startsWith('0x')) {
            cleanPrivateKey = privateKeyValue.slice(2);
        }

        // Must be valid hex and exactly 64 characters (32 bytes)
        if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
            return { isValid: false, address: '' };
        }

        // Try to create wallet and verify it works
        const wallet = new ethers.Wallet(privateKeyValue);

        // Verify wallet creation was successful
        const address = wallet.address;
        const publicKey = wallet.signingKey.publicKey;

        if (address && address.length > 0 && publicKey && publicKey.length > 0) {
            return { isValid: true, address };
        } else {
            return { isValid: false, address: '' };
        }
    } catch {
        return { isValid: false, address: '' };
    }
};

/**
 * Validates a Solana private key (basic format validation)
 */
const validateSolanaPrivateKey = (privateKeyValue: string): PrivateKeyValidationResult => {
    try {
        // Handle different formats for Solana private keys
        if (privateKeyValue.startsWith('[') && privateKeyValue.endsWith(']')) {
            // Array format: [1,2,3,...]
            const parsed = JSON.parse(privateKeyValue);
            if (Array.isArray(parsed) && parsed.length === 64) {
                return {
                    isValid: true,
                    address: 'Solana address validation requires full backend utilities'
                };
            }
        } else if (privateKeyValue.startsWith('0x')) {
            // Hex format with 0x prefix
            const hex = privateKeyValue.slice(2);
            if (/^[0-9a-fA-F]{128}$/.test(hex)) {
                return {
                    isValid: true,
                    address: 'Solana address validation requires full backend utilities'
                };
            }
        } else if (/^[0-9a-fA-F]{128}$/.test(privateKeyValue)) {
            // Plain hex format (64 bytes = 128 hex chars)
            return {
                isValid: true,
                address: 'Solana address validation requires full backend utilities'
            };
        } else if (/^[1-9A-HJ-NP-Za-km-z]{88}$/.test(privateKeyValue)) {
            // Base58 format (common for Solana)
            return {
                isValid: true,
                address: 'Solana address validation requires full backend utilities'
            };
        }

        return { isValid: false, address: '' };
    } catch {
        return { isValid: false, address: '' };
    }
};

/**
 * Validates a Sui private key (basic format validation)
 */
const validateSuiPrivateKey = (privateKeyValue: string): PrivateKeyValidationResult => {
    try {
        let cleanPrivateKey = privateKeyValue;
        if (privateKeyValue.startsWith('0x')) {
            cleanPrivateKey = privateKeyValue.slice(2);
        }

        // Sui uses Ed25519 keys (32 bytes = 64 hex chars)
        if (/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
            return {
                isValid: true,
                address: 'Sui address validation requires full backend utilities'
            };
        }

        return { isValid: false, address: '' };
    } catch {
        return { isValid: false, address: '' };
    }
};

export { VALIDATION_CONFIG }; 