import { create } from 'zustand';

interface MainSwapState {
    swapError: string | null;
    setSwapError: (error: string | null) => void;
    clearSwapError: () => void;
}

const useMainSwapStore = create<MainSwapState>((set) => ({
    swapError: null,
    setSwapError: (error) => set({ swapError: error }),
    clearSwapError: () => set({ swapError: null }),
}));

export default useMainSwapStore; 