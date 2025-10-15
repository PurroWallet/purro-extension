import { Button } from '@/client/components/ui';
import {
  ChevronRight,
  ListOrdered,
  KeyRound,
  Plus,
  Eye,
  BookText,
} from 'lucide-react';
import useCreateWalletStore from '@/client/hooks/use-create-wallet-store';

const ChooseImportMethod = ({
  onCreateAccount,
  onSeedPhrase,
  onPrivateKey,
  onWatchOnly,
  onAddressBook,
}: {
  onCreateAccount: () => void;
  onSeedPhrase: () => void;
  onPrivateKey: () => void;
  onWatchOnly: () => void;
  onAddressBook: () => void;
}) => {
  const { setImportType } = useCreateWalletStore();

  const handleCreateAccount = () => {
    setImportType('create-account');
    onCreateAccount();
  };

  const handleSeedPhrase = () => {
    setImportType('seed');
    onSeedPhrase();
  };

  const handlePrivateKey = () => {
    setImportType('privateKey');
    onPrivateKey();
  };

  const handleWatchOnly = () => {
    setImportType('watchOnly');
    onWatchOnly();
  };

  const handleAddressBook = () => {
    setImportType('addressBook');
    onAddressBook();
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">Add / Import Wallet</h1>
          <p className="text-base text-gray-500 text-center">
            Select the method
          </p>
        </div>
        <Button
          onClick={handleCreateAccount}
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <Plus className="size-6" /> Create New Account
          </div>
          <ChevronRight className="size-5" />
        </Button>
        <Button
          onClick={handleSeedPhrase}
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <ListOrdered className="size-6" />
            Import Recovery Phrase
          </div>
          <ChevronRight className="size-5" />
        </Button>
        <Button
          onClick={handlePrivateKey}
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="size-6" />
            Import Private Key
          </div>
          <ChevronRight className="size-5" />
        </Button>
        <Button
          onClick={handleWatchOnly}
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <Eye className="size-6" />
            Import Watch-Only Wallet
          </div>
          <ChevronRight className="size-5" />
        </Button>
        <Button
          onClick={handleAddressBook}
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <BookText className="size-6" />
            Import from Address Book
          </div>
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChooseImportMethod;
