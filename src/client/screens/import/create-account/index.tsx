import { useState, useEffect } from 'react';
import useCreateWalletStore from '@/client/hooks/use-create-wallet-store';
import useWallet from '@/client/hooks/use-wallet';
import ShowGeneratedSeedPhrase from './show-generated-seed-phrase';
import NoSeedPhraseFound from './no-seed-phrase-found';
import CreateFromExistingSeed from './create-from-existing-seed';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { generateMnemonic } from '@/client/lib/utils';
import LoadingDisplay from '@/client/components/display/loading-display';
import { SeedPhraseWithId } from '@/types';

const CreateAccount = ({ onNext }: { onNext: () => void }) => {
  const { accountName, setAccountName, setMnemonic } = useCreateWalletStore();
  const { accounts, initialized } = useWalletStore();
  const { createWallet, getAllSeedPhrases } = useWallet();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [error, setError] = useState<string>('');
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string>('');
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedPhrases, setSeedPhrases] = useState<SeedPhraseWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountName && initialized) {
      setAccountName(
        `Account ${accounts.length > 0 ? accounts.length + 1 : 1}`
      );
    }
  }, [accounts, accountName, setAccountName, initialized]);

  useEffect(() => {
    const fetchSeedPhrases = async () => {
      try {
        const seedPhrases = await getAllSeedPhrases();
        setSeedPhrases(seedPhrases);
      } catch (error) {
        console.error('Error fetching seed phrases:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeedPhrases();
  }, [getAllSeedPhrases]);

  const handleGenerateSeedPhrase = async () => {
    try {
      setIsGenerating(true);
      setError('');

      const mnemonic = generateMnemonic();
      if (!mnemonic) {
        throw new Error('Failed to generate mnemonic');
      }

      setGeneratedSeedPhrase(mnemonic);
      setMnemonic(mnemonic);

      // Auto-set account name if not already set
      if (!accountName) {
        const newAccountName = `Account ${accounts.length > 0 ? accounts.length + 1 : 1}`;
        setAccountName(newAccountName);
      }

      setShowSeedPhrase(true);
    } catch (err) {
      console.error('❌ Failed to generate seed phrase:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to generate seed phrase'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateNewWallet = async () => {
    try {
      setIsCreatingWallet(true);
      setError('');

      await createWallet({
        mnemonic: generatedSeedPhrase,
      });

      // Clear states on success
      setGeneratedSeedPhrase('');
      setShowSeedPhrase(false);
      setError('');

      onNext();
    } catch (err) {
      console.error('❌ Failed to create new wallet:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
      });
      setError(
        err instanceof Error ? err.message : 'Failed to create new wallet'
      );
    } finally {
      setIsCreatingWallet(false);
    }
  };

  if (loading) {
    return <LoadingDisplay />;
  }

  // Show generated seed phrase step
  if (showSeedPhrase && generatedSeedPhrase) {
    return (
      <ShowGeneratedSeedPhrase
        seedPhrase={generatedSeedPhrase}
        onCreateWallet={handleCreateNewWallet}
        isCreating={isCreatingWallet}
        error={error}
      />
    );
  }

  // Show no seed phrase found step
  if (seedPhrases.length === 0) {
    return (
      <NoSeedPhraseFound
        onGenerateSeedPhrase={handleGenerateSeedPhrase}
        isGenerating={isGenerating}
        error={error}
      />
    );
  }

  // Show create from existing seed phrase step
  return (
    <CreateFromExistingSeed
      onNext={onNext}
      accountsLength={accounts.length}
      seedPhrases={seedPhrases}
    />
  );
};

export default CreateAccount;
