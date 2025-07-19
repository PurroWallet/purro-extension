import { ethers } from "ethers";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Keypair } from "@solana/web3.js";
import { ChainType } from "../types/account";
import bs58 from 'bs58';

export type WalletKeys = {
    privateKey: string;
    publicKey: string;
    address: string;
}

export const evmWalletKeyUtils = {
    deriveFromSeed: (seed: Buffer, accountIndex: number = 0): WalletKeys => {
        try {
            const ethereumPath = `m/44'/60'/0'/0/${accountIndex}`;
            const ethereumWallet = ethers.HDNodeWallet.fromSeed(seed).derivePath(ethereumPath);

            return {
                privateKey: ethereumWallet.privateKey,
                publicKey: ethereumWallet.publicKey,
                address: ethereumWallet.address
            };
        } catch (error) {
            throw new Error(`Failed to derive Ethereum wallet from seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    deriveFromMnemonic: (mnemonic: string, accountIndex: number = 0): WalletKeys => {
        try {
            const ethereumPath = `m/44'/60'/0'/0/${accountIndex}`;
            const seed = ethers.HDNodeWallet.fromPhrase(mnemonic, "", ethereumPath);
            return {
                privateKey: seed.privateKey,
                publicKey: seed.publicKey,
                address: seed.address
            };
        } catch (error) {
            throw new Error(`Failed to derive Ethereum wallet from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    fromPrivateKey: (privateKey: string): WalletKeys => {
        try {
            // Validate private key first
            if (!evmWalletKeyUtils.isValidPrivateKey(privateKey)) {
                throw new Error('Invalid private key format');
            }

            const wallet = new ethers.Wallet(privateKey);
            return {
                privateKey: wallet.privateKey,
                publicKey: wallet.signingKey.publicKey,
                address: wallet.address
            };
        } catch (error) {
            throw new Error(`Failed to create Ethereum wallet from private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    isValidPrivateKey: (privateKey: string): boolean => {
        try {
            // Check basic format first
            let cleanPrivateKey = privateKey;
            if (privateKey.startsWith('0x')) {
                cleanPrivateKey = privateKey.slice(2);
            }

            // Must be valid hex and exactly 64 characters (32 bytes)
            if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
                return false;
            }

            // Try to create wallet and verify it works
            const wallet = new ethers.Wallet(privateKey);

            // Normalize both private keys for comparison
            const normalizedInput = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
            const normalizedWallet = wallet.privateKey;

            // Verify wallet creation was successful
            const address = wallet.address;
            const publicKey = wallet.signingKey.publicKey;

            return Boolean(normalizedInput.toLowerCase() === normalizedWallet.toLowerCase() &&
                address && address.length > 0 &&
                publicKey && publicKey.length > 0);
        } catch (error) {
            return false;
        }
    },

    isValidAddress: (address: string): boolean => {
        return ethers.isAddress(address);
    }
}

export const suiWalletKeyUtils = {
    deriveFromSeed: (seed: Buffer, accountIndex: number = 0): WalletKeys => {
        try {
            const suiPath = `m/44'/784'/0'/0'/${accountIndex}'`;
            const hdNode = ethers.HDNodeWallet.fromSeed(seed).derivePath(suiPath);

            // Chuyển đổi private key từ ethers sang Ed25519Keypair
            const privateKeyBytes = Buffer.from(hdNode.privateKey.slice(2), 'hex');
            const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes.subarray(0, 32)); // Ed25519 chỉ cần 32 bytes

            return {
                privateKey: Buffer.from(keypair.getSecretKey()).toString('hex'),
                publicKey: keypair.getPublicKey().toBase64(),
                address: keypair.toSuiAddress()
            };
        } catch (error) {
            throw new Error(`Failed to derive Sui wallet from seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    deriveFromMnemonic: (mnemonic: string, accountIndex: number = 0): WalletKeys => {
        try {
            // Sử dụng logic giống Ethereum: fromPhrase với path trực tiếp
            const suiPath = `m/44'/784'/0'/0'/${accountIndex}'`;
            const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, "", suiPath);

            // Chuyển đổi private key từ ethers sang Ed25519Keypair
            const privateKeyBytes = Buffer.from(hdNode.privateKey.slice(2), 'hex');
            const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes.subarray(0, 32));

            return {
                privateKey: Buffer.from(keypair.getSecretKey()).toString('hex'),
                publicKey: keypair.getPublicKey().toBase64(),
                address: keypair.toSuiAddress()
            };
        } catch (error) {
            throw new Error(`Failed to derive Sui wallet from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    fromPrivateKey: (privateKey: string): WalletKeys => {
        try {
            // Validate private key first
            if (!suiWalletKeyUtils.isValidPrivateKey(privateKey)) {
                throw new Error('Invalid private key format');
            }

            let cleanPrivateKey = privateKey;
            // Remove 0x prefix if present
            if (privateKey.startsWith('0x')) {
                cleanPrivateKey = privateKey.slice(2);
            }

            const privateKeyBytes = Buffer.from(cleanPrivateKey, 'hex');
            const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes); // Ed25519 expects full 32 bytes

            return {
                privateKey: Buffer.from(keypair.getSecretKey()).toString('hex'),
                publicKey: keypair.getPublicKey().toBase64(),
                address: keypair.toSuiAddress()
            };
        } catch (error) {
            throw new Error(`Failed to create Sui wallet from private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    isValidPrivateKey: (privateKey: string): boolean => {
        try {
            let cleanPrivateKey = privateKey;

            // Remove 0x prefix if present
            if (privateKey.startsWith('0x')) {
                cleanPrivateKey = privateKey.slice(2);
            }

            // Check if it's valid hex and exactly 64 characters (32 bytes)
            if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
                return false;
            }

            // Try to create keypair to validate
            const privateKeyBytes = Buffer.from(cleanPrivateKey, 'hex');
            const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);

            // Additional validation: ensure the keypair was created successfully
            // and we can get basic properties without errors
            const publicKey = keypair.getPublicKey();
            const address = keypair.toSuiAddress();

            return publicKey !== null &&
                address !== null &&
                address.length > 0 &&
                publicKey.toBase64().length > 0;
        } catch (error) {
            return false;
        }
    }
};

export const solanaWalletKeyUtils = {
    deriveFromSeed: (seed: Buffer, accountIndex: number = 0): WalletKeys => {
        try {
            const solanaPath = `m/44'/501'/${accountIndex}'/0'`;
            const hdNode = ethers.HDNodeWallet.fromSeed(seed).derivePath(solanaPath);

            // Chuyển đổi private key từ ethers sang Solana Keypair
            const privateKeyBytes = Buffer.from(hdNode.privateKey.slice(2), 'hex');
            const keypair = Keypair.fromSeed(privateKeyBytes.subarray(0, 32)); // Solana seed cần 32 bytes

            return {
                privateKey: Buffer.from(keypair.secretKey).toString('hex'),
                publicKey: keypair.publicKey.toBase58(),
                address: keypair.publicKey.toBase58()
            };
        } catch (error) {
            throw new Error(`Failed to derive Solana wallet from seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    deriveFromMnemonic: (mnemonic: string, accountIndex: number = 0): WalletKeys => {
        try {
            // Sử dụng logic giống Ethereum: fromPhrase với path trực tiếp
            const solanaPath = `m/44'/501'/${accountIndex}'/0'`;
            const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, "", solanaPath);

            // Chuyển đổi private key từ ethers sang Solana Keypair
            const privateKeyBytes = Buffer.from(hdNode.privateKey.slice(2), 'hex');
            const keypair = Keypair.fromSeed(privateKeyBytes.subarray(0, 32));

            return {
                privateKey: Buffer.from(keypair.secretKey).toString('hex'),
                publicKey: keypair.publicKey.toBase58(),
                address: keypair.publicKey.toBase58()
            };
        } catch (error) {
            throw new Error(`Failed to derive Solana wallet from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    fromPrivateKey: (privateKey: string): WalletKeys => {
        try {
            // Validate private key first
            if (!solanaWalletKeyUtils.isValidPrivateKey(privateKey)) {
                throw new Error('Invalid private key format');
            }

            let secretKey: Uint8Array;

            // Handle different private key formats
            if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
                // Array format: [1,2,3,...]
                secretKey = new Uint8Array(JSON.parse(privateKey));
            } else if (privateKey.startsWith('0x')) {
                // Hex format with 0x prefix
                const hex = privateKey.slice(2);
                secretKey = Buffer.from(hex, 'hex');
            } else if (/^[0-9a-fA-F]+$/.test(privateKey)) {
                // Plain hex format
                secretKey = Buffer.from(privateKey, 'hex');
            } else {
                // Try Base58 format
                try {
                    secretKey = bs58.decode(privateKey);
                } catch {
                    throw new Error('Invalid private key format - not hex, array, or Base58');
                }
            }

            let keypair: Keypair;
            if (secretKey.length === 32) {
                keypair = Keypair.fromSeed(secretKey);
            } else if (secretKey.length === 64) {
                keypair = Keypair.fromSecretKey(secretKey);
            } else {
                throw new Error(`Invalid secret key length: ${secretKey.length}. Expected 32 or 64 bytes.`);
            }

            return {
                privateKey: Buffer.from(keypair.secretKey).toString('hex'),
                publicKey: keypair.publicKey.toBase58(),
                address: keypair.publicKey.toBase58()
            };
        } catch (error) {
            throw new Error(`Failed to create Solana wallet from private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    fromSecretKeyArray: (secretKeyArray: number[]): WalletKeys => {
        try {
            // Validate secret key array first
            if (!solanaWalletKeyUtils.isValidSecretKeyArray(secretKeyArray)) {
                throw new Error('Invalid secret key array format');
            }

            const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

            return {
                privateKey: Buffer.from(keypair.secretKey).toString('hex'),
                publicKey: keypair.publicKey.toBase58(),
                address: keypair.publicKey.toBase58()
            };
        } catch (error) {
            throw new Error(`Failed to create Solana wallet from secret key array: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    isValidPrivateKey: (privateKey: string): boolean => {
        try {
            let secretKey: Uint8Array;

            // Handle different private key formats
            if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
                // Array format: [1,2,3,...]
                try {
                    const parsed = JSON.parse(privateKey);
                    if (!Array.isArray(parsed)) return false;
                    if (parsed.length !== 64) return false;
                    if (!parsed.every(num => typeof num === 'number' && Number.isInteger(num) && num >= 0 && num <= 255)) return false;
                    secretKey = new Uint8Array(parsed);
                } catch {
                    return false;
                }
            } else if (privateKey.startsWith('0x')) {
                // Hex format with 0x prefix
                const hex = privateKey.slice(2);
                if (!/^[0-9a-fA-F]+$/.test(hex)) return false;
                if (hex.length !== 64 && hex.length !== 128) return false;
                secretKey = Buffer.from(hex, 'hex');
            } else if (/^[0-9a-fA-F]+$/.test(privateKey)) {
                // Plain hex format
                if (privateKey.length !== 64 && privateKey.length !== 128) return false;
                secretKey = Buffer.from(privateKey, 'hex');
            } else {
                // Try Base58 format
                try {
                    secretKey = bs58.decode(privateKey);
                } catch {
                    return false;
                }
            }

            // Validate length
            if (secretKey.length !== 32 && secretKey.length !== 64) {
                return false;
            }

            // Try to create keypair based on length
            let keypair: Keypair;
            if (secretKey.length === 32) {
                keypair = Keypair.fromSeed(secretKey);
            } else {
                keypair = Keypair.fromSecretKey(secretKey);
            }

            // Additional validation: ensure the keypair was created successfully
            const publicKey = keypair.publicKey;
            const address = publicKey.toBase58();

            // Verify that we can get valid properties
            return publicKey !== null &&
                address !== null &&
                address.length > 0 &&
                keypair.secretKey !== null &&
                keypair.secretKey.length === 64; // Solana secret keys are always 64 bytes
        } catch (error) {
            return false;
        }
    },

    isValidSecretKeyArray: (secretKeyArray: number[]): boolean => {
        try {
            if (!Array.isArray(secretKeyArray)) return false;
            if (secretKeyArray.length !== 64) return false;
            if (!secretKeyArray.every(num => typeof num === 'number' && Number.isInteger(num) && num >= 0 && num <= 255)) return false;

            // Try to create keypair to validate
            const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
            const publicKey = keypair.publicKey;
            const address = publicKey.toBase58();

            return keypair !== null &&
                publicKey !== null &&
                address !== null &&
                address.length > 0;
        } catch (error) {
            return false;
        }
    },

    // Helper function to convert between different private key formats
    convertPrivateKeyFormat: (privateKey: string, targetFormat: 'hex' | 'base58' | 'array'): string => {
        try {
            // First get the wallet keys using the existing function
            const walletKeys = solanaWalletKeyUtils.fromPrivateKey(privateKey);

            // The private key is now stored as hex in walletKeys.privateKey
            const secretKeyHex = walletKeys.privateKey;
            const secretKeyBytes = Buffer.from(secretKeyHex, 'hex');

            switch (targetFormat) {
                case 'hex':
                    return secretKeyHex;
                case 'base58':
                    return bs58.encode(secretKeyBytes);
                case 'array':
                    return JSON.stringify(Array.from(secretKeyBytes));
                default:
                    throw new Error('Invalid target format');
            }
        } catch (error) {
            throw new Error(`Failed to convert private key format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};

export const multiChainWalletUtils = {
    deriveAllFromMnemonic: (mnemonic: string, accountIndex: number = 0): {
        ethereum: WalletKeys;
        sui: WalletKeys;
        solana: WalletKeys;
    } => {
        try {
            return {
                ethereum: evmWalletKeyUtils.deriveFromMnemonic(mnemonic, accountIndex),
                sui: suiWalletKeyUtils.deriveFromMnemonic(mnemonic, accountIndex),
                solana: solanaWalletKeyUtils.deriveFromMnemonic(mnemonic, accountIndex)
            };
        } catch (error) {
            throw new Error(`Failed to derive multi-chain wallets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    deriveAllFromSeed: (seed: Buffer, accountIndex: number = 0): {
        ethereum: WalletKeys;
        sui: WalletKeys;
        solana: WalletKeys;
    } => {
        try {
            return {
                ethereum: evmWalletKeyUtils.deriveFromSeed(seed, accountIndex),
                sui: suiWalletKeyUtils.deriveFromSeed(seed, accountIndex),
                solana: solanaWalletKeyUtils.deriveFromSeed(seed, accountIndex)
            };
        } catch (error) {
            throw new Error(`Failed to derive multi-chain wallets from seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    deriveAllFromPrivateKey: (privateKey: string, chain: ChainType): WalletKeys => {
        try {
            // Validate private key for the specific chain first
            if (!multiChainWalletUtils.isValidPrivateKey(privateKey, chain)) {
                throw new Error(`Invalid private key for chain: ${chain}`);
            }

            if (chain === "eip155") {
                return evmWalletKeyUtils.fromPrivateKey(privateKey);
            } else if (chain === "solana") {
                return solanaWalletKeyUtils.fromPrivateKey(privateKey);
            } else if (chain === "sui") {
                return suiWalletKeyUtils.fromPrivateKey(privateKey);
            } else {
                throw new Error(`Invalid chain type: ${chain}`);
            }
        } catch (error) {
            throw new Error(`Failed to derive multi-chain wallets from private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    isValidPrivateKey: (privateKey: string, chain: ChainType): boolean => {
        try {
            // Basic null/undefined check
            if (!privateKey || typeof privateKey !== 'string' || privateKey.trim().length === 0) {
                return false;
            }

            switch (chain) {
                case "eip155":
                    return evmWalletKeyUtils.isValidPrivateKey(privateKey);
                case "solana":
                    return solanaWalletKeyUtils.isValidPrivateKey(privateKey);
                case "sui":
                    return suiWalletKeyUtils.isValidPrivateKey(privateKey);
                default:
                    return false;
            }
        } catch (error) {
            return false;
        }
    },

    // Hàm kiểm tra private key cho tất cả chains và trả về kết quả chi tiết
    validatePrivateKeyForAllChains: (privateKey: string): {
        ethereum: boolean;
        solana: boolean;
        sui: boolean;
        validChains: ChainType[];
    } => {
        // Basic validation first
        if (!privateKey || typeof privateKey !== 'string' || privateKey.trim().length === 0) {
            return {
                ethereum: false,
                solana: false,
                sui: false,
                validChains: []
            };
        }

        const ethereum = evmWalletKeyUtils.isValidPrivateKey(privateKey);
        const solana = solanaWalletKeyUtils.isValidPrivateKey(privateKey);
        const sui = suiWalletKeyUtils.isValidPrivateKey(privateKey);

        const validChains: ChainType[] = [];
        if (ethereum) validChains.push("eip155");
        if (solana) validChains.push("solana");
        if (sui) validChains.push("sui");

        return {
            ethereum,
            solana,
            sui,
            validChains
        };
    },

    // Hàm auto-detect chain type từ private key
    detectChainFromPrivateKey: (privateKey: string): ChainType | null => {
        // Basic validation first
        if (!privateKey || typeof privateKey !== 'string' || privateKey.trim().length === 0) {
            return null;
        }

        const validation = multiChainWalletUtils.validatePrivateKeyForAllChains(privateKey);

        // Return the first valid chain, prioritizing order: ethereum -> solana -> sui
        // This is because ethereum keys are most common and have strictest validation
        if (validation.ethereum) return "eip155";
        if (validation.solana) return "solana";
        if (validation.sui) return "sui";

        return null;
    },

    // Utility function to get detailed info about a private key
    getPrivateKeyInfo: (privateKey: string): {
        isValid: boolean;
        supportedChains: ChainType[];
        detectedChain: ChainType | null;
        format: 'hex' | 'hex_with_prefix' | 'array' | 'unknown';
        length: number;
    } => {
        if (!privateKey || typeof privateKey !== 'string') {
            return {
                isValid: false,
                supportedChains: [],
                detectedChain: null,
                format: 'unknown',
                length: 0
            };
        }

        // Determine format
        let format: 'hex' | 'hex_with_prefix' | 'array' | 'unknown' = 'unknown';
        if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
            format = 'array';
        } else if (privateKey.startsWith('0x')) {
            format = 'hex_with_prefix';
        } else if (/^[0-9a-fA-F]+$/.test(privateKey)) {
            format = 'hex';
        }

        const validation = multiChainWalletUtils.validatePrivateKeyForAllChains(privateKey);
        const detectedChain = multiChainWalletUtils.detectChainFromPrivateKey(privateKey);

        return {
            isValid: validation.validChains.length > 0,
            supportedChains: validation.validChains,
            detectedChain,
            format,
            length: privateKey.length
        };
    }
};