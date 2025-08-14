import { Button } from '@/client/components/ui';
import { ChevronRight, ListOrdered, KeyRound } from 'lucide-react';
import useCreateWalletStore from '@/client/hooks/use-create-wallet-store';

const ChooseImportMethod = ({
  onSeedPhrase,
  onPrivateKey,
}: {
  onSeedPhrase: () => void;
  onPrivateKey: () => void;
}) => {
  const { setImportType } = useCreateWalletStore();

  const handleSeedPhrase = () => {
    setImportType('seed');
    onSeedPhrase();
  };

  const handlePrivateKey = () => {
    setImportType('privateKey');
    onPrivateKey();
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">Import Wallet</h1>
          <p className="text-base text-gray-500 text-center">
            Select the method
          </p>
        </div>
        <Button
          onClick={handleSeedPhrase}
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <ListOrdered className="size-6" /> Recovery Phrase
          </div>
          <ChevronRight className="size-5" />
        </Button>
        <Button
          onClick={handlePrivateKey}
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="size-6" /> Private Key
          </div>
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChooseImportMethod;
