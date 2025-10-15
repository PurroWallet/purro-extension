import { useCallback } from 'react';
import { sendMessage } from '../utils/extension-message-utils';
import type {
    Contact,
    AddressBook,
    AddContactInput,
    UpdateContactInput,
} from '@/types/address-book';
import useAddressBookStore from './use-address-book-store';

const useAddressBook = () => {
    const { setContacts, setLoading, setError } = useAddressBookStore();

    /**
     * Get all contacts from address book
     */
    const getAddressBook = useCallback(async (): Promise<AddressBook> => {
        try {
            setLoading(true);
            setError(null);
            const addressBook = (await sendMessage('GET_ADDRESS_BOOK', {})) as AddressBook;
            setContacts(addressBook.contacts, addressBook.order);
            return addressBook;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to get address book';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [setContacts, setLoading, setError]);

    /**
     * Get a specific contact by ID
     */
    const getContact = useCallback(
        async (contactId: string): Promise<Contact | null> => {
            try {
                setError(null);
                const contact = (await sendMessage('GET_CONTACT', { contactId })) as Contact;
                return contact;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to get contact';
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        },
        [setError]
    );

    /**
     * Add a new contact
     */
    const addContact = useCallback(
        async (input: AddContactInput): Promise<Contact> => {
            try {
                setLoading(true);
                setError(null);
                const contact = (await sendMessage('ADD_CONTACT', input)) as Contact;
                await getAddressBook(); // Refresh the address book
                return contact;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to add contact';
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [getAddressBook, setLoading, setError]
    );

    /**
     * Update an existing contact
     */
    const updateContact = useCallback(
        async (input: UpdateContactInput): Promise<Contact> => {
            try {
                setLoading(true);
                setError(null);
                const contact = (await sendMessage('UPDATE_CONTACT', input)) as Contact;
                await getAddressBook(); // Refresh the address book
                return contact;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to update contact';
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [getAddressBook, setLoading, setError]
    );

    /**
     * Delete a contact
     */
    const deleteContact = useCallback(
        async (contactId: string): Promise<void> => {
            try {
                setLoading(true);
                setError(null);
                await sendMessage('DELETE_CONTACT', { contactId });
                await getAddressBook(); // Refresh the address book
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to delete contact';
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [getAddressBook, setLoading, setError]
    );

    /**
     * Search contacts by name or address
     */
    const searchContacts = useCallback(
        async (query: string): Promise<Contact[]> => {
            try {
                setError(null);
                const contacts = (await sendMessage('SEARCH_CONTACTS', {
                    query,
                })) as Contact[];
                return contacts;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to search contacts';
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        },
        [setError]
    );

    /**
     * Get contacts by chain
     */
    const getContactsByChain = useCallback(
        async (chain: 'eip155' | 'solana' | 'sui'): Promise<Contact[]> => {
            try {
                setError(null);
                const contacts = (await sendMessage('GET_CONTACTS_BY_CHAIN', {
                    chain,
                })) as Contact[];
                return contacts;
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : 'Failed to get contacts by chain';
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        },
        [setError]
    );

    /**
     * Reorder contacts
     */
    const reorderContacts = useCallback(
        async (newOrder: string[]): Promise<void> => {
            try {
                setLoading(true);
                setError(null);
                await sendMessage('REORDER_CONTACTS', { order: newOrder });
                await getAddressBook(); // Refresh the address book
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to reorder contacts';
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [getAddressBook, setLoading, setError]
    );

    return {
        getAddressBook,
        getContact,
        addContact,
        updateContact,
        deleteContact,
        searchContacts,
        getContactsByChain,
        reorderContacts,
    };
};

export default useAddressBook;

