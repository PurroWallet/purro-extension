import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DevModeStore {
    isDevMode: boolean;
    setIsDevMode: (isDevMode: boolean) => void;
}

const useDevModeStore = create<DevModeStore>()(
    persist(
        (set) => ({
            isDevMode: false,
            setIsDevMode: (isDevMode) => set({ isDevMode }),
        }),
        {
            name: "dev-mode-storage",
            version: 1,
        }
    )
);

export default useDevModeStore;