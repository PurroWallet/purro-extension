import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TabType = "spot" | "perpetuals" | "evm";

interface TabSettingsState {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

const useHomeTabsStore = create<TabSettingsState>()(
    persist(
        (set) => ({
            activeTab: "evm", // Default tab
            setActiveTab: (tab: TabType) => set({ activeTab: tab }),
        }),
        {
            name: 'tab-settings-storage',
            version: 1,
        }
    )
);

export default useHomeTabsStore; 