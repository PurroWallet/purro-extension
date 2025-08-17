import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MainScreenType = 'home' | 'explore' | 'nft' | 'history' | 'swap';

interface MainScreenState {
  mainScreen: MainScreenType;
  isNftNetworkVisible: boolean;
  setMainScreen: (screen: MainScreenType) => void;
  setIsNftNetworkVisible: (visible: boolean) => void;
  toggleNftNetwork: () => void;
}

const useMainScreenStore = create<MainScreenState>()(
  persist(
    (set, get) => ({
      mainScreen: 'home',
      isNftNetworkVisible: false,
      setMainScreen: (screen: MainScreenType) => set({ mainScreen: screen }),
      setIsNftNetworkVisible: (visible: boolean) =>
        set({ isNftNetworkVisible: visible }),
      toggleNftNetwork: () =>
        set({ isNftNetworkVisible: !get().isNftNetworkVisible }),
    }),
    {
      name: 'main-screen-storage',
      version: 1,
    }
  )
);

export default useMainScreenStore;
