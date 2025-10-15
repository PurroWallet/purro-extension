import { create } from 'zustand';
import type { Contact } from '@/types/address-book';

interface AddressBookStore {
    contacts: Record<string, Contact>;
    order: string[];
    loading: boolean;
    error: string | null;
    initialized: boolean;

    // Actions
    setContacts: (contacts: Record<string, Contact>, order: string[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setInitialized: (initialized: boolean) => void;
    clearError: () => void;
    reset: () => void;
}

const initialState = {
    contacts: {},
    order: [],
    loading: false,
    error: null,
    initialized: false,
};

const useAddressBookStore = create<AddressBookStore>(set => ({
    ...initialState,

    setContacts: (contacts, order) =>
        set({
            contacts,
            order,
            initialized: true,
        }),

    setLoading: loading => set({ loading }),

    setError: error => set({ error }),

    setInitialized: initialized => set({ initialized }),

    clearError: () => set({ error: null }),

    reset: () => set(initialState),
}));

export default useAddressBookStore;

