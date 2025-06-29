import { create } from "zustand";

interface DrawerStore {
    isOpen: boolean;
    component: React.ReactNode;
    onClose: () => void;
}

interface DrawerStoreActions {
    openDrawer: (component: React.ReactNode) => void;
    closeDrawer: () => void;
}

const useDrawerStore = create<DrawerStore & DrawerStoreActions>((set) => ({
    isOpen: false,
    component: null,
    onClose: () => set({ isOpen: false }),
    openDrawer: (component) => set({ isOpen: true, component }),
    closeDrawer: () => set({ isOpen: false }),
}));

export default useDrawerStore;