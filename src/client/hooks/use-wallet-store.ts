import { create } from 'zustand';
import { WalletState } from '@/types';
import { sendMessage } from '@/client/utils/extension-message-utils';
import { AccountWallet } from '@/background/types/account';

interface ExtendedWalletState extends WalletState {
  loading: boolean;
  error: string | null;
  initialized: boolean;
  activeAccountAddress: { [key: string]: string };
}

interface WalletStateAction {
  // Actions
  loadWalletState: () => Promise<void>; // Get accurate state from background script
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  refreshState: () => Promise<void>; // Refresh from storage changes

  // Helper functions
  getActiveAccountWalletObject: () => AccountWallet | null;
  getAccountWalletObject: (accountId: string) => AccountWallet | null;
}

const useWalletStore = create<ExtendedWalletState & WalletStateAction>(
  (set, get) => ({
    isLocked: true,
    hasWallet: false,
    accounts: [],
    activeAccount: null,
    wallets: {},
    loading: false,
    error: null,
    initialized: false,
    activeAccountAddress: {},

    loadWalletState: async () => {
      try {
        set({ loading: true, error: null });
        const walletState = await sendMessage('GET_WALLET_STATE');

        // Transform to match ExtendedWalletState interface
        const transformedState: Partial<ExtendedWalletState> = {
          isLocked: walletState.isLocked,
          hasWallet: walletState.hasWallet,
          accounts: walletState.accounts,
          activeAccount: walletState.activeAccount,
          wallets: walletState.wallets,
          loading: false,
          initialized: true,
        };

        set(transformedState);
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : 'Failed to load wallet state',
          loading: false,
          initialized: true,
        });
      }
    },

    // Refresh state from storage changes
    refreshState: async () => {
      const currentState = get();
      if (!currentState.initialized) return;

      try {
        const walletState = await sendMessage('GET_WALLET_STATE');

        const transformedState: Partial<ExtendedWalletState> = {
          isLocked: walletState.isLocked,
          hasWallet: walletState.hasWallet,
          accounts: walletState.accounts,
          activeAccount: walletState.activeAccount,
          wallets: walletState.wallets,
        };

        set(transformedState);
      } catch (err) {
        set({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to refresh wallet state',
        });
      }
    },

    setLoading: (loading: boolean) => set({ loading }),

    setError: (error: string | null) => set({ error }),

    clearError: () => set({ error: null }),

    // Get active account wallet object
    getActiveAccountWalletObject: () => {
      const { activeAccount, wallets } = get();
      if (!activeAccount || !wallets[activeAccount.id]) {
        return null;
      }
      return wallets[activeAccount.id];
    },

    // Get account wallet object for any account
    getAccountWalletObject: (accountId: string) => {
      const { wallets } = get();
      return wallets[accountId] || null;
    },
  })
);

export default useWalletStore;
