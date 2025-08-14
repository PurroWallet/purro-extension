import { create } from 'zustand';

interface AccountSheetStore {
  isOpen: boolean;
}

interface AccountSheetStoreActions {
  open: () => void;
  close: () => void;
}

const useAccountSheetStore = create<
  AccountSheetStore & AccountSheetStoreActions
>(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export default useAccountSheetStore;
