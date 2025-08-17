import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DevModeStore {
  isDevMode: boolean;
  isChanging: boolean;
  setIsDevMode: (isDevMode: boolean) => void;
  setIsChanging: (isChanging: boolean) => void;
}

const useDevModeStore = create<DevModeStore>()(
  persist(
    (set, get) => ({
      isDevMode: false,
      isChanging: false,
      setIsDevMode: isDevMode => {
        const currentState = get();
        if (currentState.isDevMode === isDevMode) {
          return; // No change needed
        }

        try {
          // Set changing state first
          set({ isChanging: true });

          // Small delay to prevent race conditions
          setTimeout(() => {
            set({ isDevMode, isChanging: false });
          }, 50);
        } catch (error) {
          console.error('❌ Error setting dev mode:', error);
          set({ isChanging: false });
        }
      },
      setIsChanging: isChanging => {
        set({ isChanging });
      },
    }),
    {
      name: 'dev-mode-storage',
      version: 1,
      // onRehydrateStorage: () => state => {
      // },
    }
  )
);

export default useDevModeStore;
