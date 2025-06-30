import { AccountInformation, AccountWallet, ChainType, SeedPhraseData } from "@/background/types/account";
import { STORAGE_KEYS } from "../constants/storage-keys";
import { storageHandler } from "./storage-handler";
import { encryption } from "../lib/encryption";
import { evmWalletKeyUtils, multiChainWalletUtils, solanaWalletKeyUtils, suiWalletKeyUtils } from "../utils/keys";
import { authHandler } from "./auth-handler";
import { authValidator } from "../utils/auth-validator";
import { ethers } from "ethers";
import { CreateWalletData, ImportSeedPhraseData } from "../types/message-data";

export const accountHandler = {
    // Check methods
    async isSeedPhraseAlreadyImported(mnemonic: string): Promise<boolean> {
        try {
            // Validate input
            if (!mnemonic || typeof mnemonic !== 'string') {
                return false;
            }

            const hashId = await encryption.hashData(mnemonic.trim());
            const existingSeedPhrase = await storageHandler.getSeedPhraseById(hashId);
            return !!existingSeedPhrase;
        } catch (error) {
            console.error("Error checking seed phrase:", error);
            return false;
        }
    },

    async isPrivateKeyAlreadyImported(privateKey: string): Promise<boolean> {
        try {
            // Validate input
            if (!privateKey || typeof privateKey !== 'string') {
                return false;
            }

            const hashId = await encryption.hashData(privateKey);
            const existingPrivateKey = await storageHandler.getPrivateKeyById(hashId);
            return !!existingPrivateKey;
        } catch (error) {
            console.error("Error checking private key:", error);
            return false;
        }
    },

    async getSeedPhraseIdByMnemonic(mnemonic: string): Promise<string | null> {
        try {
            // Validate input
            if (!mnemonic || typeof mnemonic !== 'string') {
                return null;
            }

            const hashId = await encryption.hashData(mnemonic.trim());
            const existingSeedPhrase = await storageHandler.getSeedPhraseById(hashId);
            return existingSeedPhrase ? hashId : null;
        } catch (error) {
            console.error("Error getting seed phrase ID:", error);
            return null;
        }
    },

    async getPrivateKeyIdByPrivateKey(privateKey: string): Promise<string | null> {
        try {
            // Validate input
            if (!privateKey || typeof privateKey !== 'string') {
                return null;
            }

            const hashId = await encryption.hashData(privateKey);
            const existingPrivateKey = await storageHandler.getPrivateKeyById(hashId);
            return existingPrivateKey ? hashId : null;
        } catch (error) {
            console.error("Error getting private key ID:", error);
            return null;
        }
    },


    /*//////////////////////////////////////////////////////////////
                                WRITE
   //////////////////////////////////////////////////////////////*/
    async createWallet(data: CreateWalletData): Promise<AccountInformation> {
        // Validate
        const [accounts, passwordStored] = await Promise.all([
            storageHandler.getAccounts(),
            storageHandler.getStoredPassword()
        ]);
        if (accounts.length > 0) {
            throw new Error("Wallet already exists");
        }
        if (passwordStored) {
            throw new Error("Password already exists");
        }

        // Validate mnemonic
        const seedPhraseId = await this.importSeedPhrase(data);

        const account = await this.createAccountBySeedPhrase({
            seedPhraseId: seedPhraseId,
            password: data.password,
        });

        return account;
    },

    async importSeedPhrase(data: ImportSeedPhraseData): Promise<string> {
        // Validate input
        if (!data.mnemonic || typeof data.mnemonic !== 'string') {
            throw new Error("Invalid mnemonic phrase");
        }

        // Validate mnemonic
        if (!ethers.Mnemonic.isValidMnemonic(data.mnemonic.trim())) {
            throw new Error("Invalid mnemonic phrase");
        }

        // Check if seed phrase already exists
        const [isAlreadyImported, allSeedPhrases] = await Promise.all([
            this.isSeedPhraseAlreadyImported(data.mnemonic),
            storageHandler.getAllSeedPhrases()
        ]);

        if (isAlreadyImported) {
            // Return existing seed phrase ID instead of throwing error
            const existingId = await this.getSeedPhraseIdByMnemonic(data.mnemonic);
            if (existingId) {
                return existingId;
            }
            throw new Error("Seed phrase already imported but ID not found");
        }

        // Validate authentication and get password (from parameter or session)
        // If no password stored, this will save the provided password
        const authResult = await authValidator.validateAndGetPassword(data.password);

        // Parallel encryption and hashing
        const [encryptedSeedPhrase, hashId] = await Promise.all([
            encryption.encrypt(data.mnemonic.trim(), authResult.password),
            encryption.hashData(data.mnemonic.trim())
        ]);

        const seedPhraseData: SeedPhraseData = {
            name: `Seed Phrase ${allSeedPhrases.length + 1}`,
            data: encryptedSeedPhrase,
            currentDerivationIndex: -1, // Initialize to -1 so first account starts at 0
        };

        await storageHandler.saveSeedPhrase(hashId, seedPhraseData);

        return hashId;
    },

    async createAccountBySeedPhrase(data: { name?: string, icon?: string, seedPhraseId: string, password?: string }): Promise<AccountInformation> {
        try {
            // Validate authentication and get password (from parameter or session)
            const [authResult, seedPhraseData] = await Promise.all([
                authValidator.validateAndGetPassword(data.password),
                storageHandler.getSeedPhraseById(data.seedPhraseId)
            ]);

            if (!seedPhraseData) {
                throw new Error("Seed phrase not found");
            }

            let derivationIndex: number;

            if (seedPhraseData?.currentDerivationIndex !== undefined) {
                derivationIndex = seedPhraseData.currentDerivationIndex + 1;
            } else {
                derivationIndex = 0;
            }

            const accountId = crypto.randomUUID();

            const accounts = await storageHandler.getAccounts();

            const newAccount: AccountInformation = {
                id: accountId,
                name: data.name || `Account ${accounts.length > 0 ? accounts.length + 1 : 1}`,
                icon: data.icon || '🐱',
                derivationIndex,
                source: 'seedPhrase',
                seedPhraseId: data.seedPhraseId,
            };

            const mnemonic = await encryption.decrypt(seedPhraseData.data, authResult.password);
            const { ethereum, solana, sui } = multiChainWalletUtils.deriveAllFromMnemonic(mnemonic, derivationIndex);

            const wallet: AccountWallet = {
                eip155: {
                    address: ethereum.address,
                    publicKey: ethereum.publicKey,
                    pathType: 'bip44',
                },
                solana: {
                    address: solana.address,
                    publicKey: solana.publicKey,
                    pathType: 'bip44-variant',
                },
                sui: {
                    address: sui.address,
                    publicKey: sui.publicKey,
                    pathType: 'bip44-hardened',
                },
            }

            await Promise.all([
                storageHandler.saveAccountById(accountId, newAccount),
                storageHandler.saveAccounts(accountId),
                storageHandler.saveWallet(accountId, wallet),
                storageHandler.updateSeedPhrase(data.seedPhraseId, { ...seedPhraseData, currentDerivationIndex: derivationIndex }, [accountId]),
                storageHandler.setActiveAccount(accountId)
            ])

            return newAccount;
        } catch (error) {
            console.error("Error creating account by seed phrase:", error);
            throw new Error("Failed to create account. Please try again.");
        }
    },

    async importAccountByPrivateKey(data: { name: string, chain: ChainType, privateKey: string, password?: string }): Promise<AccountInformation> {
        // Validate private key format using chain-specific validation
        if (!data.privateKey || typeof data.privateKey !== 'string') {
            throw new Error("Invalid private key format");
        }

        // Validate private key based on chain type
        let isValidPrivateKey = false;
        try {
            if (data.chain === 'eip155') {
                isValidPrivateKey = evmWalletKeyUtils.isValidPrivateKey(data.privateKey);
                if (isValidPrivateKey) {
                    // Test if private key is valid by creating a wallet
                    evmWalletKeyUtils.fromPrivateKey(data.privateKey);
                }
            } else if (data.chain === 'solana') {
                isValidPrivateKey = solanaWalletKeyUtils.isValidPrivateKey(data.privateKey);
                if (isValidPrivateKey) {
                    solanaWalletKeyUtils.fromPrivateKey(data.privateKey);
                }
            } else if (data.chain === 'sui') {
                isValidPrivateKey = suiWalletKeyUtils.isValidPrivateKey(data.privateKey);
                if (isValidPrivateKey) {
                    suiWalletKeyUtils.fromPrivateKey(data.privateKey);
                }
            } else {
                throw new Error("Unsupported chain type");
            }

            if (!isValidPrivateKey) {
                throw new Error("Invalid private key format for the selected chain");
            }
        } catch (error) {
            console.error("Private key validation error:", error);
            throw new Error("Invalid private key format for the selected chain");
        }

        // Check if private key already exists
        const isAlreadyImported = await this.isPrivateKeyAlreadyImported(data.privateKey);
        if (isAlreadyImported) {
            throw new Error("Private key already imported");
        }

        // Parallel operations for validation and data preparation
        const [authResult, privateKeyId, accounts] = await Promise.all([
            authValidator.validateAndGetPassword(data.password),
            encryption.hashData(data.privateKey),
            storageHandler.getAccounts()
        ]);

        const accountId = crypto.randomUUID();

        const newAccount: AccountInformation = {
            id: accountId,
            name: data.name || `Account ${accounts.length > 0 ? accounts.length + 1 : 1}`,
            icon: '🐱',
            source: 'privateKey',
            privateKeyId: privateKeyId,
        };

        let wallet: AccountWallet | null = null;
        // Create and save wallet data
        if (data.chain === 'eip155') {
            const evmWallet = evmWalletKeyUtils.fromPrivateKey(data.privateKey);
            wallet = {
                eip155: {
                    address: evmWallet.address,
                    publicKey: evmWallet.publicKey,
                    pathType: 'imported',
                },
                solana: null,
                sui: null,
            }
        } else if (data.chain === 'solana') {
            const solanaWallet = solanaWalletKeyUtils.fromPrivateKey(data.privateKey);
            wallet = {
                eip155: null,
                solana: {
                    address: solanaWallet.address,
                    publicKey: solanaWallet.publicKey,
                    pathType: 'imported',
                },
                sui: null,
            }
        } else if (data.chain === 'sui') {
            const suiWallet = suiWalletKeyUtils.fromPrivateKey(data.privateKey);
            wallet = {
                eip155: null,
                solana: null,
                sui: {
                    address: suiWallet.address,
                    publicKey: suiWallet.publicKey,
                    pathType: 'imported',
                },
            }
        }

        if (!wallet) {
            throw new Error("Invalid chain");
        }

        const encryptedPrivateKey = await encryption.encrypt(data.privateKey, authResult.password);

        await Promise.all([
            storageHandler.savePrivateKey(privateKeyId, encryptedPrivateKey),
            storageHandler.saveAccountById(accountId, newAccount),
            storageHandler.saveAccounts(accountId),
            storageHandler.saveWallet(accountId, wallet),
            storageHandler.setActiveAccount(accountId)
        ])

        return newAccount;
    },

    async changePassword(data: { oldPassword: string, newPassword: string }): Promise<void> {
        // Validate old password
        const passwordStored = await storageHandler.getStoredPassword();
        if (!passwordStored) {
            throw new Error("No password found");
        }

        const isValidOldPassword = await encryption.verifyPassword(data.oldPassword, passwordStored.data, passwordStored.salt);
        if (!isValidOldPassword) {
            throw new Error("Invalid old password");
        }

        // Get all seed phrases and private keys that need re-encryption in parallel
        const [allSeedPhrases, allPrivateKeys] = await Promise.all([
            storageHandler.getAllSeedPhrases(),
            storageHandler.getAllPrivateKeys()
        ]);

        // Process all seed phrases in parallel
        const seedPhrasePromises = allSeedPhrases.map(async ({ id, data: seedPhraseData }) => {
            // Decrypt with old password
            const decryptedSeedPhrase = await encryption.decrypt(seedPhraseData.data, data.oldPassword);
            // Re-encrypt with new password
            const reEncryptedSeedPhrase = await encryption.encrypt(decryptedSeedPhrase, data.newPassword);

            return {
                id,
                data: {
                    ...seedPhraseData,
                    data: reEncryptedSeedPhrase
                }
            };
        });

        // Process all private keys in parallel
        const privateKeyPromises = allPrivateKeys.map(async ({ id, data: privateKeyData }) => {
            // Decrypt with old password
            const decryptedPrivateKey = await encryption.decrypt(privateKeyData, data.oldPassword);
            // Re-encrypt with new password
            const reEncryptedPrivateKey = await encryption.encrypt(decryptedPrivateKey, data.newPassword);

            return {
                id,
                data: reEncryptedPrivateKey
            };
        });

        // Wait for all encryption operations to complete
        const [seedPhraseUpdates, privateKeyUpdates, newPasswordEncrypted] = await Promise.all([
            Promise.all(seedPhrasePromises),
            Promise.all(privateKeyPromises),
            encryption.hashPassword(data.newPassword)
        ]);

        // Save all updates in parallel
        try {
            const updatePromises = [
                // Update main password
                chrome.storage.local.set({ [STORAGE_KEYS.ACCOUNT_PASSWORD]: newPasswordEncrypted }),

                // Update all seed phrases
                ...seedPhraseUpdates.map(update => {
                    const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace(':id', update.id);
                    return chrome.storage.local.set({ [storageKey]: update.data });
                }),

                // Update all private keys
                ...privateKeyUpdates.map(update => {
                    const storageKey = STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace(':id', update.id);
                    return chrome.storage.local.set({ [storageKey]: update.data });
                })
            ];

            await Promise.all(updatePromises);

            // Update current session if unlocked
            const currentSession = await authHandler.getSession();
            if (currentSession) {
                await authHandler.lock();
                await authHandler.unlock({ password: data.newPassword });
            }

        } catch (error) {
            console.error("Error changing password:", error);
            throw new Error("Failed to change password. Please try again.");
        }
    },

    // Remove methods
    async removeAccount(accountId: string): Promise<void> {
        const account = await storageHandler.getAccountById(accountId);

        if (!account) {
            throw new Error("Account not found");
        }

        try {
            // Parallel removal operations
            const removePromises = [
                storageHandler.removeAccountFromList(accountId),
                storageHandler.removeAccountById(accountId),
                storageHandler.removeWallet(accountId)
            ];

            // Clean up associated private key (1-1 relationship)
            if (account.source === 'privateKey' && account.privateKeyId) {
                removePromises.push(storageHandler.removePrivateKey(account.privateKeyId));
            }

            await Promise.all(removePromises);

            // Update seed phrase accountIds if this account uses a seed phrase
            if (account.source === 'seedPhrase' && account.seedPhraseId) {
                await storageHandler.removeAccountFromSeedPhrase(account.seedPhraseId, accountId);
            }

            // Reset wallet if no accounts remain
            const remainingAccounts = await storageHandler.getAccounts();
            if (remainingAccounts.length === 0) {
                await storageHandler.resetWallet();
            }

        } catch (error) {
            console.error("Error removing account:", error);
            throw new Error("Failed to remove account. Please try again.");
        }
    },

    async removeSeedPhrase(seedPhraseId: string): Promise<void> {
        const seedPhraseData = await storageHandler.getSeedPhraseById(seedPhraseId);

        if (!seedPhraseData) {
            throw new Error("Seed phrase not found");
        }

        try {
            // Use accountIds from seedPhraseData if available, otherwise fallback to searching
            let accountsToRemove: string[] = [];

            if (seedPhraseData.accountIds && seedPhraseData.accountIds.length > 0) {
                // Use the stored accountIds for efficiency
                accountsToRemove = seedPhraseData.accountIds;
            } else {
                // Fallback: Find all accounts using this seed phrase (for backward compatibility)
                const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNTS]);
                const accountIds: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

                // Parallel account checks
                const accountPromises = accountIds.map(async (accountId) => {
                    const account = await storageHandler.getAccountById(accountId);
                    return { accountId, account };
                });

                const accountResults = await Promise.all(accountPromises);
                accountsToRemove = accountResults
                    .filter(({ account }) => account && account.source === 'seedPhrase' && account.seedPhraseId === seedPhraseId)
                    .map(({ accountId }) => accountId);
            }

            // Remove all accounts using this seed phrase in parallel
            const removeAccountPromises = accountsToRemove.map(async (accountId) => {
                await Promise.all([
                    storageHandler.removeAccountFromList(accountId),
                    storageHandler.removeAccountById(accountId),
                    storageHandler.removeWallet(accountId)
                ]);
            });

            await Promise.all([
                ...removeAccountPromises,
                storageHandler.removeSeedPhrase(seedPhraseId)
            ]);

            // Reset wallet if no accounts remain
            const remainingSeedAccounts = await storageHandler.getAccounts();
            if (remainingSeedAccounts.length === 0) {
                await storageHandler.resetWallet();
            }

        } catch (error) {
            console.error("Error removing seed phrase:", error);
            throw new Error("Failed to remove seed phrase and associated accounts. Please try again.");
        }
    },

    async removePrivateKey(privateKeyId: string): Promise<void> {
        const privateKeyData = await storageHandler.getPrivateKeyById(privateKeyId);

        if (!privateKeyData) {
            throw new Error("Private key not found");
        }

        try {
            // Find all accounts using this private key
            const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNTS]);
            const accountIds: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

            // Parallel account checks
            const accountPromises = accountIds.map(async (accountId) => {
                const account = await storageHandler.getAccountById(accountId);
                return { accountId, account };
            });

            const accountResults = await Promise.all(accountPromises);
            const accountsToRemove = accountResults
                .filter(({ account }) => account && account.source === 'privateKey' && account.privateKeyId === privateKeyId)
                .map(({ accountId }) => accountId);

            // Remove all accounts using this private key in parallel
            const removeAccountPromises = accountsToRemove.map(async (accountId) => {
                await Promise.all([
                    storageHandler.removeAccountFromList(accountId),
                    storageHandler.removeAccountById(accountId),
                    storageHandler.removeWallet(accountId)
                ]);
            });

            await Promise.all([
                ...removeAccountPromises,
                storageHandler.removePrivateKey(privateKeyId)
            ]);

            // Reset wallet if no accounts remain
            const remainingPKAccounts = await storageHandler.getAccounts();
            if (remainingPKAccounts.length === 0) {
                await storageHandler.resetWallet();
            }

        } catch (error) {
            console.error("Error removing private key:", error);
            throw new Error("Failed to remove private key and associated accounts. Please try again.");
        }
    },

    async resetWallet(): Promise<void> {
        try {
            // Parallel operations for wallet reset
            await Promise.all([
                authHandler.lock(),
                storageHandler.resetWallet()
            ]);

        } catch (error) {
            console.error("Error resetting wallet:", error);
            throw new Error("Failed to reset wallet. Please try again.");
        }
    },

    // Read methods
    async getPrivateKeyByAccountId(accountId: string): Promise<string> {
        const [session, account] = await Promise.all([
            authHandler.getSession(),
            storageHandler.getAccountById(accountId)
        ]);

        if (!session) {
            throw new Error("Session not unlocked");
        }

        if (!account) {
            throw new Error("Account not found");
        }

        let privateKey: string;

        if (account.source === 'privateKey' && account.privateKeyId) {
            // Get private key directly
            const encryptedPrivateKey = await storageHandler.getPrivateKeyById(account.privateKeyId);
            if (!encryptedPrivateKey) {
                throw new Error("Private key not found");
            }
            privateKey = await encryption.decrypt(encryptedPrivateKey, session.password);
        } else if (account.source === 'seedPhrase' && account.seedPhraseId && account.derivationIndex !== undefined) {
            // Derive private key from seed phrase
            const seedPhraseData = await storageHandler.getSeedPhraseById(account.seedPhraseId);
            if (!seedPhraseData) {
                throw new Error("Seed phrase not found");
            }

            const mnemonic = await encryption.decrypt(seedPhraseData.data, session.password);
            const mnemonicInstance = ethers.Mnemonic.fromPhrase(mnemonic);
            const seed = Buffer.from(mnemonicInstance.computeSeed());
            const evmWallet = evmWalletKeyUtils.deriveFromSeed(seed, account.derivationIndex);
            privateKey = evmWallet.privateKey;
        } else {
            throw new Error("Invalid account configuration");
        }

        return privateKey;
    },

    // Overload definitions for better DX
    async exportPrivateKey(accountId: string, chainOrPassword: ChainType | string, maybePassword?: string): Promise<string> {
        // Allow calling with (accountId, password) or (accountId, chain, password)
        let selectedChain: ChainType = "eip155"; // Default to EVM
        let password: string;

        if (maybePassword === undefined) {
            // Signature: (accountId, password)
            password = chainOrPassword as string;
        } else {
            // Signature: (accountId, chain, password)
            selectedChain = chainOrPassword as ChainType;
            password = maybePassword as string;
        }

        // Parallel validation and account retrieval
        const [passwordStored, account] = await Promise.all([
            storageHandler.getStoredPassword(),
            storageHandler.getAccountById(accountId)
        ]);

        if (!passwordStored) {
            throw new Error("No password found");
        }

        if (!account) {
            throw new Error("Account not found");
        }

        const isValidPassword = await encryption.verifyPassword(password, passwordStored.data, passwordStored.salt);
        if (!isValidPassword) {
            throw new Error("Invalid password");
        }

        let privateKey: string;

        // Case 1: Account created from an imported private key
        if (account.source === 'privateKey' && account.privateKeyId) {
            const encryptedPrivateKey = await storageHandler.getPrivateKeyById(account.privateKeyId);
            if (!encryptedPrivateKey) {
                throw new Error("Private key not found");
            }
            privateKey = await encryption.decrypt(encryptedPrivateKey, password);

            // Optional: Validate the decrypted key matches the requested chain
            if (!multiChainWalletUtils.isValidPrivateKey(privateKey, selectedChain)) {
                throw new Error(`The stored private key is not valid for chain ${selectedChain}`);
            }
        }
        // Case 2: Account derived from a seed phrase – derive key according to chain
        else if (account.source === 'seedPhrase' && account.seedPhraseId && account.derivationIndex !== undefined) {
            const seedPhraseData = await storageHandler.getSeedPhraseById(account.seedPhraseId);
            if (!seedPhraseData) {
                throw new Error("Seed phrase not found");
            }

            const mnemonic = await encryption.decrypt(seedPhraseData.data, password);

            if (selectedChain === 'eip155') {
                privateKey = evmWalletKeyUtils.deriveFromMnemonic(mnemonic, account.derivationIndex).privateKey;
            } else if (selectedChain === 'solana') {
                privateKey = solanaWalletKeyUtils.deriveFromMnemonic(mnemonic, account.derivationIndex).privateKey;
            } else if (selectedChain === 'sui') {
                privateKey = suiWalletKeyUtils.deriveFromMnemonic(mnemonic, account.derivationIndex).privateKey;
            } else {
                throw new Error("Unsupported chain type");
            }
        }
        else {
            throw new Error("Invalid account configuration");
        }

        return privateKey;
    },

    async exportSeedPhrase(seedPhraseId: string, password: string): Promise<string> {
        const [passwordStored, seedPhraseData] = await Promise.all([
            storageHandler.getStoredPassword(),
            storageHandler.getSeedPhraseById(seedPhraseId)
        ]);

        if (!passwordStored) {
            throw new Error("No password found");
        }

        if (!seedPhraseData) {
            throw new Error("Seed phrase not found");
        }

        const isValidPassword = await encryption.verifyPassword(password, passwordStored.data, passwordStored.salt);
        if (!isValidPassword) {
            throw new Error("Invalid password");
        }

        const mnemonic = await encryption.decrypt(seedPhraseData.data, password);
        return mnemonic;
    },

};