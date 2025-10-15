import { useEffect, useState, useMemo } from 'react';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useAddressBook from '@/client/hooks/use-address-book';
import useAddressBookStore from '@/client/hooks/use-address-book-store';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui/dialog';
import { Button, Input } from '@/client/components/ui';
import { XIcon, Search, Plus, Edit2, Trash2, BookText } from 'lucide-react';
import type { Contact } from '@/types/address-book';

interface MainAddressBookProps {
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contact: Contact) => void;
  onBack?: () => void;
}

const CHAIN_LABELS = {
  eip155: 'EVM',
  solana: 'Solana',
  sui: 'Sui',
  all: 'All Chains',
};

export const MainAddressBook = ({
  onAddContact,
  onEditContact,
  onDeleteContact,
  onBack,
}: MainAddressBookProps) => {
  const { closeDialog } = useDialogStore();
  const { getAddressBook } = useAddressBook();
  const { contacts, order, loading, initialized } = useAddressBookStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!initialized) {
      getAddressBook();
    }
  }, [initialized, getAddressBook]);

  const filteredContacts = useMemo(() => {
    const contactList = order.map(id => contacts[id]).filter(Boolean);

    if (!searchQuery.trim()) {
      return contactList;
    }

    const query = searchQuery.toLowerCase();
    return contactList.filter(
      contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.address.toLowerCase().includes(query) ||
        contact.note?.toLowerCase().includes(query)
    );
  }, [contacts, order, searchQuery]);

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleClose = () => {
    if (onBack) {
      onBack();
    } else {
      closeDialog();
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Address Book"
        onClose={handleClose}
        icon={<XIcon className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add Contact Button */}
          <Button
            onClick={onAddContact}
            className="w-full flex items-center justify-center gap-2"
          >
            <Plus className="size-4" />
            Add Contact
          </Button>

          {/* Contacts List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading && !initialized ? (
              <div className="text-center py-8 text-white/60">
                Loading contacts...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8">
                <BookText className="size-12 mx-auto mb-2 text-white/20" />
                <p className="text-white/60">
                  {searchQuery ? 'No contacts found' : 'No contacts yet'}
                </p>
                <p className="text-sm text-white/40 mt-1">
                  {searchQuery
                    ? 'Try a different search'
                    : 'Add your first contact to get started'}
                </p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white truncate">
                          {contact.name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 whitespace-nowrap">
                          {CHAIN_LABELS[contact.chain]}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 font-mono break-all">
                        {formatAddress(contact.address)}
                      </p>
                      {contact.note && (
                        <p className="text-xs text-white/40 mt-1 line-clamp-2">
                          {contact.note}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => onEditContact(contact)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Edit contact"
                      >
                        <Edit2 className="size-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => onDeleteContact(contact)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 className="size-4 text-red-400/80" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};
