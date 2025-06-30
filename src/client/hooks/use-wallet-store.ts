import { create } from 'zustand';
import { WalletState } from '@/types';
import { sendMessage } from '@/client/utils/extension-message-utils';
interface ExtendedWalletState extends WalletState {
    loading: boolean;
    error: string | null;
    initialized: boolean;
}

interface WalletStateAction {
    // Actions
    loadWalletState: () => Promise<void>; // Get accurate state from background script
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    refreshState: () => Promise<void>; // Refresh from storage changes
}

const useWalletStore = create<ExtendedWalletState & WalletStateAction>((set, get) => ({
    isLocked: true,
    hasWallet: false,
    accounts: [],
    activeAccount: null,
    wallets: {},
    loading: false,
    error: null,
    initialized: false,

    loadWalletState: async () => {
        try {
            set({ loading: true, error: null });
            const walletState = await sendMessage("GET_WALLET_STATE")

            // Transform to match ExtendedWalletState interface
            const transformedState: Partial<ExtendedWalletState> = {
                isLocked: walletState.isLocked,
                hasWallet: walletState.hasWallet,
                accounts: walletState.accounts,
                activeAccount: walletState.activeAccount,
                wallets: walletState.wallets,
                loading: false,
                initialized: true
            };

            set(transformedState);
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : 'Failed to load wallet state',
                loading: false,
                initialized: true
            });
        }
    },

    // Refresh state from storage changes
    refreshState: async () => {
        const currentState = get();
        if (!currentState.initialized) return;

        try {
            const walletState = await sendMessage("GET_WALLET_STATE");

            const transformedState: Partial<ExtendedWalletState> = {
                isLocked: walletState.isLocked,
                hasWallet: walletState.hasWallet,
                accounts: walletState.accounts,
                activeAccount: walletState.activeAccount,
                wallets: walletState.wallets,
            };

            set(transformedState);
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to refresh wallet state' });
        }
    },

    setLoading: (loading: boolean) => set({ loading }),

    setError: (error: string | null) => set({ error }),

    clearError: () => set({ error: null }),
}))

export default useWalletStore;

