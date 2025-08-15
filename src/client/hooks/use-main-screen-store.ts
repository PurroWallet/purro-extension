import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MainScreenType = 'home' | 'explore' | 'nft' | 'history' | 'swap';

interface MainScreenState {
    mainScreen: MainScreenType;
    isNftNetworkVisible: boolean;
    isHistoryVisible: boolean;
    setMainScreen: (screen: MainScreenType) => void;
    setIsNftNetworkVisible: (visible: boolean) => void;
    setIsHistoryVisible: (visible: boolean) => void;
    toggleNftNetwork: () => void;
    toggleHistory: () => void;
}

const useMainScreenStore = create<MainScreenState>()(
    persist(
        (set, get) => ({
            mainScreen: 'home',
            isNftNetworkVisible: false,
            isHistoryVisible: false,
            setMainScreen: (screen: MainScreenType) => set({ mainScreen: screen }),
            setIsNftNetworkVisible: (visible: boolean) => set({ isNftNetworkVisible: visible }),
            setIsHistoryVisible: (visible: boolean) => set({ isHistoryVisible: visible }),
            toggleNftNetwork: () => set({ isNftNetworkVisible: !get().isNftNetworkVisible }),
            toggleHistory: () => set({ isHistoryVisible: !get().isHistoryVisible }),
        }),
        {
            name: 'main-screen-storage',
            version: 1,
        }
    )
);

export default useMainScreenStore; 