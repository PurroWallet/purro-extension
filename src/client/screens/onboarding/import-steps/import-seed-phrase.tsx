import { useState } from 'react';
import { Button, MnemonicInput } from '@/client/components/ui';
import useCreateWalletStore from '@/client/hooks/use-create-wallet-store';

const ImportSeedPhrase = ({ onNext }: { onNext: () => void }) => {
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [isValidSeedPhrase, setIsValidSeedPhrase] = useState(false);
  const { mnemonic, setMnemonic } = useCreateWalletStore();

  const handleSeedPhraseChange = (newSeedPhrase: string) => {
    setMnemonic(newSeedPhrase);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsValidSeedPhrase(isValid);
  };

  const handleWordCountChange = (newWordCount: 12 | 24) => {
    setWordCount(newWordCount);
    setMnemonic(''); // Reset seed phrase when changing word count
    setIsValidSeedPhrase(false); // Reset validation state
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-4 overflow-y-auto">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">
            Enter your Recovery Phrase
          </h1>
        </div>

        {/* Word count selector */}
        <div className="flex justify-center">
          <div className="flex bg-[var(--card-color)] rounded-lg p-1 border border-white/10">
            <Button
              onClick={() => handleWordCountChange(12)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                wordCount === 12
                  ? 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/80'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              12 words
            </Button>
            <Button
              onClick={() => handleWordCountChange(24)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                wordCount === 24
                  ? 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/80'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              24 words
            </Button>
          </div>
        </div>

        <div className="flex-1 w-full max-w-2xl">
          <MnemonicInput
            key={wordCount} // Force re-render when word count changes
            onSeedPhraseChange={handleSeedPhraseChange}
            onValidationChange={handleValidationChange}
            wordCount={wordCount}
          />
        </div>
      </div>
      <div className="w-full pt-2">
        <Button
          className="w-full"
          disabled={!mnemonic || !isValidSeedPhrase}
          onClick={() => {
            onNext();
          }}
        >
          Import
        </Button>
      </div>
    </div>
  );
};

export default ImportSeedPhrase;
