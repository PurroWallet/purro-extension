import { create } from 'zustand';

interface DialogStore {
  isOpen: boolean;
  component: React.ReactNode;
  onClose: () => void;
}

interface DialogStoreActions {
  openDialog: (component: React.ReactNode) => void;
  closeDialog: () => void;
}

const useDialogStore = create<DialogStore & DialogStoreActions>(set => ({
  isOpen: false,
  component: null,
  onClose: () => set({ isOpen: false }),
  openDialog: component => set({ isOpen: true, component }),
  closeDialog: () => set({ isOpen: false }),
}));

export default useDialogStore;
