import { AccountInformation, AccountWallet, DataEncryption, SeedPhraseData } from "@/background/types/account";
import { PasswordData } from "@/background/types/storage";
import { STORAGE_KEYS } from "../constants/storage-keys";
import { WalletState } from "@/types";
import { authHandler } from "./auth-handler";

export const storageHandler = {
    // Read
    async getWalletState(): Promise<WalletState> {
        const [accounts, isUnlocked, activeAccount, allAccounts, allWallets] = await Promise.all([
            this.getAccounts(),
            authHandler.isUnlocked(),
            this.getActiveAccount(),
            this.getAllAccounts(),
            this.getAllWallets()
        ]);
        return {
            isLocked: !isUnlocked,
            hasWallet: accounts.length > 0,
            accounts: allAccounts,
            activeAccount: activeAccount,
            wallets: allWallets
        }
    },

    async getAllAccounts(): Promise<AccountInformation[]> {
        const accounts = await this.getAccounts();

        // Parallel account fetching
        const accountPromises = accounts.map(async (accountId) => {
            const account = await this.getAccountById(accountId);
            if (!account) {
                console.warn(`Account with ID ${accountId} not found`);
            }
            return account;
        });

        const accountResults = await Promise.all(accountPromises);
        return accountResults.filter((account): account is AccountInformation => account !== null);
    },

    async getAllWallets(): Promise<AccountWallet[]> {
        const accounts = await this.getAllAccounts();

        // Parallel wallet fetching
        const walletPromises = accounts.map(async (account) => {
            return await this.getWalletById(account.id);
        });

        const walletResults = await Promise.all(walletPromises);
        return walletResults.filter((wallet): wallet is AccountWallet => wallet !== null);
    },

    async getActiveAccount(): Promise<AccountInformation | null> {
        const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT]);
        const rawActive = result[STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT] as unknown;
        const activeAccountId = rawActive as string | AccountInformation | undefined;
        if (!activeAccountId) {
            return null;
        }

        // If the stored value is an object (legacy data), return it directly
        if (typeof activeAccountId !== 'string') {
            return activeAccountId as AccountInformation;
        }

        return await storageHandler.getAccountById(activeAccountId);
    },

    async getAccounts(): Promise<string[]> {
        const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNTS]);
        return result[STORAGE_KEYS.ACCOUNTS] || [];
    },

    async getAccountById(id: string): Promise<AccountInformation | null> {
        const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNT_BY_ID.replace('id', id)]);
        return result[STORAGE_KEYS.ACCOUNT_BY_ID.replace('id', id)] || null;
    },

    async getSeedPhraseById(seedPhraseId: string): Promise<SeedPhraseData | null> {
        const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace('id', seedPhraseId)]);
        return result[STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace('id', seedPhraseId)] || null;
    },

    async getPrivateKeyById(privateKeyId: string): Promise<DataEncryption | null> {
        const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace('id', privateKeyId)]);
        return result[STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace('id', privateKeyId)] || null;
    },

    async getWalletById(walletId: string): Promise<AccountWallet | null> {
        const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace('id', walletId)]);
        return result[STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace('id', walletId)] || null;
    },

    getStoredPassword: async (): Promise<PasswordData | null> => {
        const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNT_PASSWORD);
        return result[STORAGE_KEYS.ACCOUNT_PASSWORD] || null;
    },

    getAccountsBySeedPhraseId: async (seedPhraseId: string): Promise<AccountInformation[]> => {
        const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS);
        const accounts: AccountInformation[] = result[STORAGE_KEYS.ACCOUNTS] || [];

        return accounts.filter((account: AccountInformation) => account.seedPhraseId === seedPhraseId);
    },

    getAllSeedPhrases: async (): Promise<{ id: string, data: SeedPhraseData }[]> => {
        try {
            // Get all accounts to find unique seed phrase IDs
            const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNTS]);
            const accountIds: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

            // Parallel account fetching to collect seed phrase IDs
            const accountPromises = accountIds.map(async (accountId: string) => {
                const account = await storageHandler.getAccountById(accountId);
                return account;
            });

            const accountResults = await Promise.all(accountPromises);

            // Collect unique seed phrase IDs
            const seedPhraseIds = new Set<string>();
            accountResults.forEach((account: AccountInformation | null) => {
                if (account && account.source === 'seedPhrase' && account.seedPhraseId) {
                    seedPhraseIds.add(account.seedPhraseId);
                }
            });

            // Parallel seed phrase fetching
            const seedPhrasePromises = Array.from(seedPhraseIds).map(async (seedPhraseId: string) => {
                const seedPhraseData = await storageHandler.getSeedPhraseById(seedPhraseId);
                return seedPhraseData ? { id: seedPhraseId, data: seedPhraseData } : null;
            });

            const seedPhraseResults = await Promise.all(seedPhrasePromises);
            return seedPhraseResults.filter((item: { id: string, data: SeedPhraseData } | null): item is { id: string, data: SeedPhraseData } => item !== null);
        } catch (error) {
            console.error("Error getting all seed phrases: ", error);
            throw error;
        }
    },

    getAllPrivateKeys: async (): Promise<{ id: string, data: DataEncryption }[]> => {
        try {
            // Get all accounts to find private key IDs
            const result = await chrome.storage.local.get([STORAGE_KEYS.ACCOUNTS]);
            const accountIds: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

            // Parallel account fetching
            const accountPromises = accountIds.map(async (accountId: string) => {
                const account = await storageHandler.getAccountById(accountId);
                return account;
            });

            const accountResults = await Promise.all(accountPromises);

            // Parallel private key fetching
            const privateKeyPromises = accountResults
                .filter((account: AccountInformation | null): account is AccountInformation =>
                    account !== null && account.source === 'privateKey' && account.privateKeyId !== undefined
                )
                .map(async (account: AccountInformation) => {
                    const privateKeyData = await storageHandler.getPrivateKeyById(account.privateKeyId!);
                    return privateKeyData ? { id: account.privateKeyId!, data: privateKeyData } : null;
                });

            const privateKeyResults = await Promise.all(privateKeyPromises);
            return privateKeyResults.filter((item: { id: string, data: DataEncryption } | null): item is { id: string, data: DataEncryption } => item !== null);
        } catch (error) {
            console.error("Error getting all private keys: ", error);
            throw error;
        }
    },

    // Write
    savePassword: async (data: PasswordData): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_PASSWORD;
            const result = await chrome.storage.local.get(storageKey);

            if (result[storageKey]) {
                throw new Error("Password already exists");
            }

            await chrome.storage.local.set({ [storageKey]: data });
        } catch (error) {
            console.error("Error saving account password: ", error);
            throw error;
        }
    },

    saveAccounts: async (accountId: string): Promise<string[]> => {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS);
            const currentAccounts: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

            if (currentAccounts.includes(accountId)) {
                throw new Error("Account already exists");
            }

            await chrome.storage.local.set({
                [STORAGE_KEYS.ACCOUNTS]: [...currentAccounts, accountId]
            });

            // Automatically set active account if this is the first account being added
            if (currentAccounts.length === 0) {
                await storageHandler.setActiveAccount(accountId);
            }

            return [...currentAccounts, accountId];
        } catch (error) {
            console.error("Error saving accounts: ", error);
            throw error;
        }
    },

    saveAccountById: async (accountId: string, account: AccountInformation): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_BY_ID.replace("id", accountId);
            const result = await chrome.storage.local.get(storageKey);

            if (result[storageKey]) {
                throw new Error("Account already exists");
            }

            await chrome.storage.local.set({ [storageKey]: account });
        } catch (error) {
            console.error("Error saving account by id: ", error);
            throw error;
        }
    },

    savePrivateKey: async (privateKeyId: string, privateKey: DataEncryption): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace("id", privateKeyId);
            const result = await chrome.storage.local.get(storageKey);

            if (result[storageKey]) {
                throw new Error("Private key already exists");
            }

            await chrome.storage.local.set({ [storageKey]: privateKey });
        } catch (error) {
            console.error("Error saving private key: ", error);
            throw error;
        }
    },

    saveSeedPhrase: async (seedPhraseId: string, seedPhrase: SeedPhraseData): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace("id", seedPhraseId);
            await chrome.storage.local.set({ [storageKey]: seedPhrase });
        } catch (error) {
            console.error("Error saving seed phrase: ", error);
            throw error;
        }
    },

    saveWallet: async (id: string, wallet: AccountWallet): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace("id", id);
            const result = await chrome.storage.local.get(storageKey);

            if (result[storageKey]) {
                throw new Error("Wallet already exists");
            }

            await chrome.storage.local.set({ [storageKey]: wallet });
        } catch (error) {
            console.error("Error saving wallet: ", error);
            throw error;
        }
    },

    // Update
    setActiveAccount: async (accountId: string): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT;
            await chrome.storage.local.set({ [storageKey]: accountId });
        } catch (error) {
            console.error("Error setting active account: ", error);
            throw error;
        }
    },

    updateSeedPhrase: async (seedPhraseId: string, seedPhrase: SeedPhraseData, accountIds: string[]): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace("id", seedPhraseId);
            const currentSeedPhraseData = await chrome.storage.local.get(storageKey);
            const currentSeedPhrase: SeedPhraseData = currentSeedPhraseData[storageKey] || {};

            await chrome.storage.local.set({ [storageKey]: { ...currentSeedPhrase, ...seedPhrase, accountIds: [...(currentSeedPhrase.accountIds || []), ...accountIds] } });
        } catch (error) {
            console.error("Error updating seed phrase: ", error);
            throw error;
        }
    },

    removeAccountFromSeedPhrase: async (seedPhraseId: string, accountId: string): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace("id", seedPhraseId);
            const currentSeedPhraseData = await chrome.storage.local.get(storageKey);
            const currentSeedPhrase: SeedPhraseData = currentSeedPhraseData[storageKey];

            if (currentSeedPhrase && currentSeedPhrase.accountIds) {
                const updatedAccountIds = currentSeedPhrase.accountIds.filter(id => id !== accountId);
                await chrome.storage.local.set({
                    [storageKey]: {
                        ...currentSeedPhrase,
                        accountIds: updatedAccountIds
                    }
                });
            }
        } catch (error) {
            console.error("Error removing account from seed phrase: ", error);
            throw error;
        }
    },

    // Remove/Delete methods
    removeAccountFromList: async (accountId: string): Promise<string[]> => {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS);
            const currentAccounts: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

            const updatedAccounts = currentAccounts.filter(id => id !== accountId);

            await chrome.storage.local.set({
                [STORAGE_KEYS.ACCOUNTS]: updatedAccounts
            });

            // If the removed account was active, update active account to the next available one or clear it
            const currentActive = await storageHandler.getActiveAccount();
            if (currentActive && currentActive.id === accountId) {
                if (updatedAccounts.length > 0) {
                    await storageHandler.setActiveAccount(updatedAccounts[0]);
                } else {
                    // No accounts left, remove active account key
                    await chrome.storage.local.remove(STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT);
                }
            }

            return updatedAccounts;
        } catch (error) {
            console.error("Error removing account from list: ", error);
            throw error;
        }
    },

    removeAccountById: async (accountId: string): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_BY_ID.replace("id", accountId);
            await chrome.storage.local.remove(storageKey);
        } catch (error) {
            console.error("Error removing account by id: ", error);
            throw error;
        }
    },

    removePrivateKey: async (privateKeyId: string): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace("id", privateKeyId);
            await chrome.storage.local.remove(storageKey);
        } catch (error) {
            console.error("Error removing private key: ", error);
            throw error;
        }
    },

    removeSeedPhrase: async (seedPhraseId: string): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace("id", seedPhraseId);
            await chrome.storage.local.remove(storageKey);
        } catch (error) {
            console.error("Error removing seed phrase: ", error);
            throw error;
        }
    },

    removeWallet: async (walletId: string): Promise<void> => {
        try {
            const storageKey = STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace("id", walletId);
            await chrome.storage.local.remove(storageKey);
        } catch (error) {
            console.error("Error removing wallet: ", error);
            throw error;
        }
    },

    // Reset all wallet data
    resetWallet: async (): Promise<void> => {
        try {
            await chrome.storage.local.clear();
        } catch (error) {
            console.error("Error resetting wallet: ", error);
            throw error;
        }
    },
}


