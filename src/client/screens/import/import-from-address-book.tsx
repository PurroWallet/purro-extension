import { Button } from '@/client/components/ui';
import { useState, useEffect } from 'react';
import useWallet from '@/client/hooks/use-wallet';
import useAddressBook from '@/client/hooks/use-address-book';
import useAddressBookStore from '@/client/hooks/use-address-book-store';
import { ChainType } from '@/background/types/account';
import { BookText, Search, CheckCircle2 } from 'lucide-react';

const CHAIN_LABELS = {
  eip155: 'EVM',
  solana: 'Solana',
  sui: 'Sui',
  all: 'All Chains',
};

const ImportFromAddressBook = ({ onNext }: { onNext: () => void }) => {
  const { importWatchOnlyWallet, checkWatchOnlyAddressExists } = useWallet();
  const { getAddressBook } = useAddressBook();
  const {
    contacts,
    order,
    initialized: addressBookInitialized,
  } = useAddressBookStore();
  const [error, setError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!addressBookInitialized) {
      getAddressBook();
    }
  }, [addressBookInitialized, getAddressBook]);

  const filteredContacts = order
    .map(id => contacts[id])
    .filter(contact => {
      if (!contact) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.address.toLowerCase().includes(query) ||
        contact.note?.toLowerCase().includes(query)
      );
    });

  const selectedContact = selectedContactId
    ? contacts[selectedContactId]
    : null;

  const handleImport = async () => {
    if (!selectedContact) {
      setError('Please select a contact');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      // Check if address already exists
      const addressExists = await checkWatchOnlyAddressExists(
        selectedContact.address
      );
      if (addressExists) {
        setError('This address is already imported as watch-only');
        setImporting(false);
        return;
      }

      // Map chain type
      let finalChain: ChainType;
      if (
        selectedContact.chain === 'all' ||
        selectedContact.chain === 'eip155'
      ) {
        finalChain = 'eip155';
      } else {
        finalChain = selectedContact.chain as ChainType;
      }

      // Auto-generate account name
      const accountName = `${selectedContact.name} (${CHAIN_LABELS[selectedContact.chain]})`;

      await importWatchOnlyWallet(
        selectedContact.address,
        finalChain,
        accountName
      );

      // Clear any errors before navigating
      setError(null);
      setImporting(false);
      onNext();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to import watch-only wallet';
      setError(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-4 overflow-hidden flex flex-col">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">
            Import from Address Book
          </h1>
          <p className="text-base text-gray-500 text-center">
            Select a contact to import as watch-only
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white placeholder-gray-400 text-sm"
          />
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {!addressBookInitialized ? (
            <div className="text-center py-8 text-gray-400">
              Loading contacts...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <BookText className="size-12 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-400">
                {searchQuery
                  ? 'No contacts found'
                  : 'No contacts in address book'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery
                  ? 'Try a different search'
                  : 'Add contacts in your wallet first'}
              </p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedContactId === contact.id
                    ? 'bg-[var(--primary-color-light)]/10 border-[var(--primary-color-light)]'
                    : 'bg-[var(--card-color)] border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white truncate">
                        {contact.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400 whitespace-nowrap">
                        {CHAIN_LABELS[contact.chain]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono break-all">
                      {formatAddress(contact.address)}
                    </p>
                    {contact.note && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {contact.note}
                      </p>
                    )}
                  </div>
                  {selectedContactId === contact.id && (
                    <CheckCircle2 className="size-5 text-[var(--primary-color-light)] flex-shrink-0 ml-2" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Import Button */}
      <Button
        className="w-full"
        disabled={!selectedContact || importing}
        onClick={handleImport}
      >
        {importing ? 'Importing...' : 'Import as Watch-Only'}
      </Button>
    </div>
  );
};

export default ImportFromAddressBook;
