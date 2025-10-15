import { STORAGE_KEYS } from '../constants/storage-keys';
import type {
    Contact,
    AddressBook,
    AddContactInput,
    UpdateContactInput,
} from '../../types/address-book';

export const addressBookHandler = {
    /**
     * Get all contacts from address book
     */
    async getAddressBook(): Promise<AddressBook> {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEYS.ADDRESS_BOOK);
            return (
                result[STORAGE_KEYS.ADDRESS_BOOK] || {
                    contacts: {},
                    order: [],
                }
            );
        } catch (error) {
            console.error('Error getting address book:', error);
            return { contacts: {}, order: [] };
        }
    },

    /**
     * Get a specific contact by ID
     */
    async getContact(contactId: string): Promise<Contact | null> {
        try {
            const addressBook = await this.getAddressBook();
            return addressBook.contacts[contactId] || null;
        } catch (error) {
            console.error('Error getting contact:', error);
            return null;
        }
    },

    /**
     * Add a new contact
     */
    async addContact(input: AddContactInput): Promise<Contact> {
        try {
            const addressBook = await this.getAddressBook();

            // Check if address already exists
            const existingContact = Object.values(addressBook.contacts).find(
                contact =>
                    contact.address.toLowerCase() === input.address.toLowerCase() &&
                    (contact.chain === input.chain || contact.chain === 'all' || input.chain === 'all')
            );

            if (existingContact) {
                throw new Error('Address already exists in address book');
            }

            const contactId = crypto.randomUUID();
            const now = Date.now();

            const newContact: Contact = {
                id: contactId,
                name: input.name.trim(),
                address: input.address.trim(),
                chain: input.chain,
                note: input.note?.trim(),
                createdAt: now,
                updatedAt: now,
            };

            addressBook.contacts[contactId] = newContact;
            addressBook.order.push(contactId);

            await chrome.storage.local.set({
                [STORAGE_KEYS.ADDRESS_BOOK]: addressBook,
            });

            return newContact;
        } catch (error) {
            console.error('Error adding contact:', error);
            throw error;
        }
    },

    /**
     * Update an existing contact
     */
    async updateContact(input: UpdateContactInput): Promise<Contact> {
        try {
            const addressBook = await this.getAddressBook();
            const existingContact = addressBook.contacts[input.id];

            if (!existingContact) {
                throw new Error('Contact not found');
            }

            // If address is being updated, check for duplicates
            if (input.address && input.address !== existingContact.address) {
                const duplicateContact = Object.values(addressBook.contacts).find(
                    contact =>
                        contact.id !== input.id &&
                        contact.address.toLowerCase() === input.address!.toLowerCase() &&
                        (contact.chain === (input.chain || existingContact.chain) ||
                            contact.chain === 'all' ||
                            (input.chain || existingContact.chain) === 'all')
                );

                if (duplicateContact) {
                    throw new Error('Address already exists in address book');
                }
            }

            const updatedContact: Contact = {
                ...existingContact,
                name: input.name?.trim() || existingContact.name,
                address: input.address?.trim() || existingContact.address,
                chain: input.chain || existingContact.chain,
                note: input.note !== undefined ? input.note?.trim() : existingContact.note,
                updatedAt: Date.now(),
            };

            addressBook.contacts[input.id] = updatedContact;

            await chrome.storage.local.set({
                [STORAGE_KEYS.ADDRESS_BOOK]: addressBook,
            });

            return updatedContact;
        } catch (error) {
            console.error('Error updating contact:', error);
            throw error;
        }
    },

    /**
     * Delete a contact
     */
    async deleteContact(contactId: string): Promise<void> {
        try {
            const addressBook = await this.getAddressBook();

            if (!addressBook.contacts[contactId]) {
                throw new Error('Contact not found');
            }

            delete addressBook.contacts[contactId];
            addressBook.order = addressBook.order.filter(id => id !== contactId);

            await chrome.storage.local.set({
                [STORAGE_KEYS.ADDRESS_BOOK]: addressBook,
            });
        } catch (error) {
            console.error('Error deleting contact:', error);
            throw error;
        }
    },

    /**
     * Search contacts by name or address
     */
    async searchContacts(query: string): Promise<Contact[]> {
        try {
            const addressBook = await this.getAddressBook();
            const searchQuery = query.toLowerCase().trim();

            if (!searchQuery) {
                return addressBook.order.map(id => addressBook.contacts[id]).filter(Boolean);
            }

            return addressBook.order
                .map(id => addressBook.contacts[id])
                .filter(
                    contact =>
                        contact &&
                        (contact.name.toLowerCase().includes(searchQuery) ||
                            contact.address.toLowerCase().includes(searchQuery) ||
                            contact.note?.toLowerCase().includes(searchQuery))
                );
        } catch (error) {
            console.error('Error searching contacts:', error);
            return [];
        }
    },

    /**
     * Get contacts by chain
     */
    async getContactsByChain(
        chain: 'eip155' | 'solana' | 'sui'
    ): Promise<Contact[]> {
        try {
            const addressBook = await this.getAddressBook();

            return addressBook.order
                .map(id => addressBook.contacts[id])
                .filter(
                    contact =>
                        contact && (contact.chain === chain || contact.chain === 'all')
                );
        } catch (error) {
            console.error('Error getting contacts by chain:', error);
            return [];
        }
    },

    /**
     * Reorder contacts
     */
    async reorderContacts(newOrder: string[]): Promise<void> {
        try {
            const addressBook = await this.getAddressBook();

            // Validate that all IDs exist
            const validIds = newOrder.filter(id => addressBook.contacts[id]);

            if (validIds.length !== Object.keys(addressBook.contacts).length) {
                throw new Error('Invalid contact order');
            }

            addressBook.order = validIds;

            await chrome.storage.local.set({
                [STORAGE_KEYS.ADDRESS_BOOK]: addressBook,
            });
        } catch (error) {
            console.error('Error reordering contacts:', error);
            throw error;
        }
    },
};

