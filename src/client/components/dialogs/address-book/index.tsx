import { useState } from 'react';
import { MainAddressBook } from './main-address-book';
import { AddEditContact } from './add-edit-contact';
import { DeleteContact } from './delete-contact';
import type { Contact } from '@/types/address-book';

type AddressBookView = 'main' | 'add' | 'edit' | 'delete';

interface AddressBookProps {
  onBack?: () => void;
}

export const AddressBook = ({ onBack }: AddressBookProps = {}) => {
  const [view, setView] = useState<AddressBookView>('main');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleAddContact = () => {
    setSelectedContact(null);
    setView('add');
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setView('edit');
  };

  const handleDeleteContact = (contact: Contact) => {
    setSelectedContact(contact);
    setView('delete');
  };

  const handleBack = () => {
    setSelectedContact(null);
    setView('main');
  };

  return (
    <>
      {view === 'main' && (
        <MainAddressBook
          onAddContact={handleAddContact}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
          onBack={onBack}
        />
      )}
      {(view === 'add' || view === 'edit') && (
        <AddEditContact
          contact={selectedContact}
          onBack={handleBack}
          onSuccess={handleBack}
        />
      )}
      {view === 'delete' && selectedContact && (
        <DeleteContact
          contact={selectedContact}
          onBack={handleBack}
          onSuccess={handleBack}
        />
      )}
    </>
  );
};

export default AddressBook;
