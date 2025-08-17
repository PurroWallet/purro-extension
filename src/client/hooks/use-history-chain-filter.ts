import { create } from 'zustand';
import type { ChainFilter } from '@/client/constants/chain-filter-options';

interface HistoryChainFilterStore {
  chainFilter: ChainFilter;
  setChainFilter: (filter: ChainFilter) => void;
}

const useHistoryChainFilterStore = create<HistoryChainFilterStore>(set => ({
  chainFilter: 'all',
  setChainFilter: filter => set({ chainFilter: filter }),
}));

export default useHistoryChainFilterStore;
