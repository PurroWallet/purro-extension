import {
  AccountInformation,
  AccountWallet,
  DataEncryption,
  SeedPhraseData,
} from '@/background/types/account';
import { PasswordData } from '@/background/types/storage';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { WalletState } from '@/types';
import { authHandler } from './auth-handler';

export const storageHandler = {
  // Read
  async getWalletState(): Promise<WalletState> {
    const [accounts, isUnlocked, activeAccount, allAccounts, allWallets] =
      await Promise.all([
        this.getAccounts(),
        authHandler.isUnlocked(),
        this.getActiveAccount(),
        this.getAllAccounts(),
        this.getAllWallets(),
      ]);
    return {
      isLocked: !isUnlocked,
      hasWallet: accounts.length > 0,
      accounts: allAccounts,
      activeAccount: activeAccount,
      wallets: allWallets,
    };
  },

  async getAllAccounts(): Promise<AccountInformation[]> {
    const accounts = await this.getAccounts();

    // Parallel account fetching
    const accountPromises = accounts.map(async accountId => {
      const account = await this.getAccountById(accountId);
      if (!account) {
        console.warn(`Account with ID ${accountId} not found`);
      }
      return account;
    });

    const accountResults = await Promise.all(accountPromises);
    return accountResults.filter(
      (account): account is AccountInformation => account !== null
    );
  },

  async getAllWallets(): Promise<{ [key: string]: AccountWallet }> {
    const accounts = await this.getAllAccounts();

    // Parallel wallet fetching
    const walletPromises = accounts.map(async account => {
      return await this.getWalletById(account.id);
    });

    const walletResults = await Promise.all(walletPromises);

    // Build a mapping from account ID to its wallet, skipping null wallets
    const walletMap: { [key: string]: AccountWallet } = {};
    accounts.forEach((account, index) => {
      const wallet = walletResults[index];
      if (wallet) {
        walletMap[account.id] = wallet;
      }
    });

    return walletMap;
  },

  async getActiveAccount(): Promise<AccountInformation | null> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT,
    ]);
    const activeAccountId = result[
      STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT
    ] as unknown;
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
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ACCOUNT_BY_ID.replace('id', id),
    ]);
    return result[STORAGE_KEYS.ACCOUNT_BY_ID.replace('id', id)] || null;
  },

  async getSeedPhraseById(
    seedPhraseId: string
  ): Promise<SeedPhraseData | null> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace('id', seedPhraseId),
    ]);
    return (
      result[
      STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace('id', seedPhraseId)
      ] || null
    );
  },

  async getPrivateKeyById(
    privateKeyId: string
  ): Promise<DataEncryption | null> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace('id', privateKeyId),
    ]);
    return (
      result[
      STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace('id', privateKeyId)
      ] || null
    );
  },

  async getWalletById(walletId: string): Promise<AccountWallet | null> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace('id', walletId),
    ]);
    return (
      result[STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace('id', walletId)] || null
    );
  },

  getStoredPassword: async (): Promise<PasswordData | null> => {
    const result = await chrome.storage.local.get(
      STORAGE_KEYS.ACCOUNT_PASSWORD
    );
    return result[STORAGE_KEYS.ACCOUNT_PASSWORD] || null;
  },

  getAccountsBySeedPhraseId: async (
    seedPhraseId: string
  ): Promise<AccountInformation[]> => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS);
    const accounts: AccountInformation[] = result[STORAGE_KEYS.ACCOUNTS] || [];

    return accounts.filter(
      (account: AccountInformation) => account.seedPhraseId === seedPhraseId
    );
  },

  getAllSeedPhrases: async (): Promise<
    { id: string; data: SeedPhraseData }[]
  > => {
    try {
      // Fetch every item from chrome storage
      const allItems = await chrome.storage.local.get(null);

      const prefix = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace('id', ''); // 'purro:account:seed-phrase:'

      const seedPhraseEntries = Object.entries(allItems)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => {
          const id = key.substring(prefix.length);
          return { id, data: value as SeedPhraseData };
        });

      return seedPhraseEntries;
    } catch (error) {
      console.error('Error getting all seed phrases: ', error);
      throw error;
    }
  },

  getAllPrivateKeys: async (): Promise<
    { id: string; data: DataEncryption }[]
  > => {
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
        .filter(
          (account: AccountInformation | null): account is AccountInformation =>
            account !== null &&
            account.source === 'privateKey' &&
            account.privateKeyId !== undefined
        )
        .map(async (account: AccountInformation) => {
          const privateKeyData = await storageHandler.getPrivateKeyById(
            account.privateKeyId!
          );
          return privateKeyData
            ? { id: account.privateKeyId!, data: privateKeyData }
            : null;
        });

      const privateKeyResults = await Promise.all(privateKeyPromises);
      return privateKeyResults.filter(
        (
          item: { id: string; data: DataEncryption } | null
        ): item is { id: string; data: DataEncryption } => item !== null
      );
    } catch (error) {
      console.error('Error getting all private keys: ', error);
      throw error;
    }
  },

  getConnectedSites: async (
    accountId: string
  ): Promise<
    {
      origin: string;
      favicon?: string;
      timestamp: number;
    }[]
  > => {
    const storageKey = STORAGE_KEYS.ACCOUNT_CONNECTED_SITES.replace(
      'id',
      accountId
    );
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] || [];
  },

  // Write
  savePassword: async (data: PasswordData): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_PASSWORD;
      const result = await chrome.storage.local.get(storageKey);

      if (result[storageKey]) {
        throw new Error('Password already exists');
      }

      await chrome.storage.local.set({ [storageKey]: data });
    } catch (error) {
      console.error('Error saving account password: ', error);
      throw error;
    }
  },

  saveAccounts: async (accountId: string): Promise<string[]> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS);
      const currentAccounts: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

      if (currentAccounts.includes(accountId)) {
        throw new Error('Account already exists');
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.ACCOUNTS]: [...currentAccounts, accountId],
      });

      // Automatically set active account if this is the first account being added
      if (currentAccounts.length === 0) {
        await storageHandler.setActiveAccount(accountId);
      }

      return [...currentAccounts, accountId];
    } catch (error) {
      console.error('Error saving accounts: ', error);
      throw error;
    }
  },

  saveAccountById: async (
    accountId: string,
    account: AccountInformation
  ): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_BY_ID.replace('id', accountId);
      const result = await chrome.storage.local.get(storageKey);

      if (result[storageKey]) {
        throw new Error('Account already exists');
      }

      await chrome.storage.local.set({ [storageKey]: account });
    } catch (error) {
      console.error('Error saving account by id: ', error);
      throw error;
    }
  },

  savePrivateKey: async (
    privateKeyId: string,
    privateKey: DataEncryption
  ): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace(
        'id',
        privateKeyId
      );
      const result = await chrome.storage.local.get(storageKey);

      if (result[storageKey]) {
        throw new Error('Private key already exists');
      }

      await chrome.storage.local.set({ [storageKey]: privateKey });
    } catch (error) {
      console.error('Error saving private key: ', error);
      throw error;
    }
  },

  saveSeedPhrase: async (
    seedPhraseId: string,
    seedPhrase: SeedPhraseData
  ): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace(
        'id',
        seedPhraseId
      );
      await chrome.storage.local.set({ [storageKey]: seedPhrase });
    } catch (error) {
      console.error('Error saving seed phrase: ', error);
      throw error;
    }
  },

  saveWallet: async (id: string, wallet: AccountWallet): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace('id', id);
      const result = await chrome.storage.local.get(storageKey);

      if (result[storageKey]) {
        throw new Error('Wallet already exists');
      }

      await chrome.storage.local.set({ [storageKey]: wallet });
    } catch (error) {
      console.error('Error saving wallet: ', error);
      throw error;
    }
  },

  saveConnectedSite: async (
    accountId: string,
    site: {
      origin: string;
      favicon?: string;
      timestamp: number;
    }
  ): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_CONNECTED_SITES.replace(
        'id',
        accountId
      );
      const currentSites = await storageHandler.getConnectedSites(accountId);

      // Check if site already exists to prevent duplicates
      const existingIndex = currentSites.findIndex(
        existingSite => existingSite.origin === site.origin
      );

      if (existingIndex >= 0) {
        // Update existing site with new timestamp and favicon
        currentSites[existingIndex] = {
          ...currentSites[existingIndex],
          favicon: site.favicon || currentSites[existingIndex].favicon,
          timestamp: site.timestamp,
        };
      } else {
        // Add new site
        currentSites.push(site);
      }

      await chrome.storage.local.set({ [storageKey]: currentSites });
    } catch (error) {
      console.error('Error saving connected site: ', error);
      throw error;
    }
  },

  // Update
  setActiveAccount: async (accountId: string): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT;
      await chrome.storage.local.set({ [storageKey]: accountId });
    } catch (error) {
      throw error;
    }
  },

  updateSeedPhrase: async (
    seedPhraseId: string,
    seedPhrase: SeedPhraseData,
    accountIds: string[]
  ): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace(
        'id',
        seedPhraseId
      );
      const currentSeedPhraseData = await chrome.storage.local.get(storageKey);
      const currentSeedPhrase: SeedPhraseData =
        currentSeedPhraseData[storageKey] || {};

      await chrome.storage.local.set({
        [storageKey]: {
          ...currentSeedPhrase,
          ...seedPhrase,
          accountIds: [...(currentSeedPhrase.accountIds || []), ...accountIds],
        },
      });
    } catch (error) {
      console.error('Error updating seed phrase: ', error);
      throw error;
    }
  },

  removeAccountFromSeedPhrase: async (
    seedPhraseId: string,
    accountId: string
  ): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace(
        'id',
        seedPhraseId
      );
      const currentSeedPhraseData = await chrome.storage.local.get(storageKey);
      const currentSeedPhrase: SeedPhraseData =
        currentSeedPhraseData[storageKey];

      if (currentSeedPhrase && currentSeedPhrase.accountIds) {
        const updatedAccountIds = currentSeedPhrase.accountIds.filter(
          id => id !== accountId
        );
        await chrome.storage.local.set({
          [storageKey]: {
            ...currentSeedPhrase,
            accountIds: updatedAccountIds,
          },
        });
      }
    } catch (error) {
      console.error('Error removing account from seed phrase: ', error);
      throw error;
    }
  },

  // Remove/Delete methods
  removeAccountFromList: async (accountId: string): Promise<string[]> => {
    try {
      const currentAccounts = await storageHandler.getAccounts();

      const updatedAccounts = currentAccounts.filter(id => id !== accountId);

      await chrome.storage.local.set({
        [STORAGE_KEYS.ACCOUNTS]: updatedAccounts,
      });

      // If the removed account was active, update active account to the next available one or clear it
      const currentActive = await storageHandler.getActiveAccount();
      if (currentActive && currentActive.id === accountId) {
        if (updatedAccounts.length > 0) {
          await storageHandler.setActiveAccount(updatedAccounts[0]);
        } else {
          // No accounts left, remove active account key
          await chrome.storage.local.remove(
            STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT
          );
        }
      }

      return updatedAccounts;
    } catch (error) {
      console.error('Error removing account from list: ', error);
      throw error;
    }
  },

  removeAccountById: async (accountId: string): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_BY_ID.replace('id', accountId);
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      console.error('Error removing account by id: ', error);
      throw error;
    }
  },

  removePrivateKey: async (privateKeyId: string): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_PRIVATE_KEY_BY_ID.replace(
        'id',
        privateKeyId
      );
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      console.error('Error removing private key: ', error);
      throw error;
    }
  },

  removeSeedPhrase: async (seedPhraseId: string): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_SEED_PHRASE_BY_ID.replace(
        'id',
        seedPhraseId
      );
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      console.error('Error removing seed phrase: ', error);
      throw error;
    }
  },

  removeWallet: async (walletId: string): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_WALLET_BY_ID.replace(
        'id',
        walletId
      );
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      console.error('Error removing wallet: ', error);
      throw error;
    }
  },

  // Reset all wallet data
  resetWallet: async (): Promise<void> => {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Error resetting wallet: ', error);
      throw error;
    }
  },

  reorderAccounts: async (orderedAccountIds: string[]): Promise<void> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS);
      const currentAccounts: string[] = result[STORAGE_KEYS.ACCOUNTS] || [];

      // Validate that all provided IDs exist in the current accounts
      const allIdsExist = orderedAccountIds.every(id =>
        currentAccounts.includes(id)
      );
      if (!allIdsExist) {
        throw new Error(
          'One or more account IDs do not exist in the current accounts'
        );
      }

      // Reorder accounts
      await chrome.storage.local.set({
        [STORAGE_KEYS.ACCOUNTS]: orderedAccountIds,
      });
    } catch (error) {
      console.error('Error reordering accounts: ', error);
      throw error;
    }
  },

  changeAccountIcon: async (data: {
    accountId: string;
    icon: string;
  }): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_BY_ID.replace(
        'id',
        data.accountId
      );
      const currentAccount = await chrome.storage.local.get(storageKey);
      const currentAccountData: AccountInformation =
        currentAccount[storageKey] || {};
      await chrome.storage.local.set({
        [storageKey]: { ...currentAccountData, icon: data.icon },
      });
    } catch (error) {
      console.error('Error changing account icon: ', error);
      throw error;
    }
  },

  changeAccountName: async (data: {
    accountId: string;
    name: string;
  }): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_BY_ID.replace(
        'id',
        data.accountId
      );
      const currentAccount = await chrome.storage.local.get(storageKey);
      const currentAccountData: AccountInformation =
        currentAccount[storageKey] || {};
      await chrome.storage.local.set({
        [storageKey]: { ...currentAccountData, name: data.name },
      });
    } catch (error) {
      console.error('Error changing account name: ', error);
      throw error;
    }
  },

  deleteConnectedSite: async (
    accountId: string,
    origin: string
  ): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_CONNECTED_SITES.replace(
        'id',
        accountId
      );
      const currentSites = await storageHandler.getConnectedSites(accountId);
      await chrome.storage.local.set({
        [storageKey]: currentSites.filter(site => site.origin !== origin),
      });
    } catch (error) {
      console.error('Error deleting connected site: ', error);
      throw error;
    }
  },

  deleteAllConnectedSites: async (accountId: string): Promise<void> => {
    try {
      const storageKey = STORAGE_KEYS.ACCOUNT_CONNECTED_SITES.replace(
        'id',
        accountId
      );
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      console.error('Error deleting all connected sites: ', error);
      throw error;
    }
  },

  setCurrentChainId: async (chainId: string): Promise<void> => {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.CURRENT_CHAIN_ID]: chainId,
      });
    } catch (error) {
      console.error('Error setting current chain ID: ', error);
      throw error;
    }
  },

  getCurrentChainId: async (): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.CURRENT_CHAIN_ID,
      ]);
      return result[STORAGE_KEYS.CURRENT_CHAIN_ID] || null;
    } catch (error) {
      console.error('Error getting current chain ID: ', error);
      return null;
    }
  },
};
