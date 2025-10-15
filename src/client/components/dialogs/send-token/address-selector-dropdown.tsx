import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { BookText, Wallet, Search } from 'lucide-react';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useAddressBook from '@/client/hooks/use-address-book';
import useAddressBookStore from '@/client/hooks/use-address-book-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { AddressBook } from '../address-book';
import { AccountIcon } from '@/client/components/account';
import { Input } from '@/client/components/ui';
import type { Contact } from '@/types/address-book';

interface AddressSelectorDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  position: { top: number; left: number };
  chain: 'eip155' | 'solana' | 'sui';
}

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const AddressSelectorDropdown = ({
  isOpen,
  onClose,
  onSelect,
  position,
  chain,
}: AddressSelectorDropdownProps) => {
  const { accounts, wallets } = useWalletStore();
  const { getContactsByChain } = useAddressBook();
  const { contacts: allContacts, initialized } = useAddressBookStore();
  const { openDialog } = useDialogStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  // Fetch contacts on mount
  useEffect(() => {
    if (!initialized) {
      getContactsByChain(chain).then(setFilteredContacts).catch(console.error);
    } else {
      // Filter contacts from store
      const contacts = Object.values(allContacts).filter(
        contact => contact.chain === chain || contact.chain === 'all'
      );
      setFilteredContacts(contacts);
    }
  }, [initialized, chain, getContactsByChain, allContacts]);

  // Filter by search query
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const query = searchQuery.toLowerCase();
    return accounts.filter(
      account =>
        account.name.toLowerCase().includes(query) ||
        wallets[account.id]?.[chain]?.address?.toLowerCase().includes(query)
    );
  }, [accounts, wallets, searchQuery, chain]);

  const filteredContactsList = useMemo(() => {
    if (!searchQuery.trim()) return filteredContacts;
    const query = searchQuery.toLowerCase();
    return filteredContacts.filter(
      contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.address.toLowerCase().includes(query)
    );
  }, [filteredContacts, searchQuery]);

  const handleSelect = (address: string) => {
    onSelect(address);
    onClose();
    setSearchQuery('');
  };

  const handleOpenAddressBook = () => {
    onClose();
    openDialog(<AddressBook />);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed bg-[var(--background-color)] border border-white/10 rounded-lg shadow-lg max-h-[400px] overflow-hidden min-w-[340px] w-max z-[9999] flex flex-col"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Header */}
        <div className="p-3 border-b border-white/10 space-y-2">
          <p className="text-sm font-medium text-[var(--text-color)]">
            Select Address
          </p>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/40" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* My Accounts Section */}
          {filteredAccounts.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-white/5 flex items-center gap-2">
                <Wallet className="size-3.5 text-white/60" />
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  My Accounts
                </p>
              </div>
              {filteredAccounts.map(account => {
                const wallet = wallets[account.id];
                const address = wallet?.[chain]?.address;
                if (!address) return null;

                return (
                  <button
                    key={account.id}
                    onClick={() => handleSelect(address)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="size-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <AccountIcon icon={account.icon} alt="Account" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-[var(--text-color)] truncate">
                        {account.name}
                      </p>
                      <p className="text-xs text-[var(--text-color)]/60 font-mono">
                        {truncateAddress(address)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Address Book Section */}
          {filteredContactsList.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-white/5 flex items-center gap-2">
                <BookText className="size-3.5 text-white/60" />
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  Address Book
                </p>
              </div>
              {filteredContactsList.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact.address)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="size-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <BookText className="size-4 text-white/60" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-[var(--text-color)] truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-[var(--text-color)]/60 font-mono">
                      {truncateAddress(contact.address)}
                    </p>
                    {contact.note && (
                      <p className="text-xs text-[var(--text-color)]/40 truncate mt-0.5">
                        {contact.note}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredAccounts.length === 0 &&
            filteredContactsList.length === 0 && (
              <div className="py-8 px-3 text-center">
                <p className="text-sm text-white/60">
                  {searchQuery ? 'No results found' : 'No addresses available'}
                </p>
              </div>
            )}
        </div>

        {/* Footer - Manage Address Book */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={handleOpenAddressBook}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <BookText className="size-4 text-white/60" />
            <span className="text-sm text-white/80">Manage Address Book</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
