import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Constants for easy customization
const STORAGE_KEYS = {
  WATCHLIST: 'purro-dapps-watchlist',
} as const;

interface WatchlistStore {
  watchlist: string[]; // Array of DApp IDs

  // Actions
  addToWatchlist: (dappId: string) => void;
  removeFromWatchlist: (dappId: string) => void;
  toggleWatchlist: (dappId: string) => void;
  isInWatchlist: (dappId: string) => boolean;
  clearWatchlist: () => void;
}

const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      watchlist: [],

      addToWatchlist: (dappId: string) => {
        const { watchlist } = get();
        if (!watchlist.includes(dappId)) {
          set({ watchlist: [...watchlist, dappId] });
        }
      },

      removeFromWatchlist: (dappId: string) => {
        const { watchlist } = get();
        set({ watchlist: watchlist.filter(id => id !== dappId) });
      },

      toggleWatchlist: (dappId: string) => {
        const { watchlist, addToWatchlist, removeFromWatchlist } = get();
        if (watchlist.includes(dappId)) {
          removeFromWatchlist(dappId);
        } else {
          addToWatchlist(dappId);
        }
      },

      isInWatchlist: (dappId: string) => {
        const { watchlist } = get();
        return watchlist.includes(dappId);
      },

      clearWatchlist: () => {
        set({ watchlist: [] });
      },
    }),
    {
      name: STORAGE_KEYS.WATCHLIST,
      partialize: state => ({ watchlist: state.watchlist }),
    }
  )
);

export default useWatchlistStore;
