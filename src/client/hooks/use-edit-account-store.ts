import { create } from 'zustand';

interface EditAccountStore {
  selectedAccountId?: string;
  setSelectedAccountId: (accountId: string) => void;
}

const useEditAccountStore = create<EditAccountStore>(set => ({
  selectedAccountId: undefined,
  setSelectedAccountId: accountId => set({ selectedAccountId: accountId }),
}));

export default useEditAccountStore;
