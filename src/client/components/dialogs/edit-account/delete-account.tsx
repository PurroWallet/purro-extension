import useWallet from '@/client/hooks/use-wallet';
import useWalletStore from '@/client/hooks/use-wallet-store';
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import useEditAccountStore from '@/client/hooks/use-edit-account-store';
import { useEffect } from 'react';

const DeleteAccount = ({
  onBack,
  onRemove,
}: {
  onBack: () => void;
  onRemove: () => void;
}) => {
  const { removeAccount } = useWallet();
  const { selectedAccountId } = useEditAccountStore();
  const { accounts, hasWallet } = useWalletStore();
  const account = accounts.find(account => account.id === selectedAccountId);
  const isAccountHaveSeedPhrase = account?.seedPhraseId !== undefined;

  // Check if this is the last account
  const isLastAccount = accounts.length === 1;

  useEffect(() => {
    // If wallet no longer exists (was reset), redirect to onboarding
    if (!hasWallet) {
      window.location.href = '/onboarding.html';
    }
  }, [hasWallet]);

  if (!selectedAccountId) {
    return <div>No account selected</div>;
  }

  const handleDeleteAccount = async () => {
    await removeAccount(selectedAccountId);

    // If this was the last account, the wallet will be reset automatically
    // and we'll be redirected to onboarding via the useEffect above
    if (!isLastAccount) {
      onRemove();
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader title="Remove Account" onClose={onBack} />
      <DialogContent>
        <div className="space-y-4">
          <p className="text-base font-medium text-[var(--text-color)]">
            Are you sure you want to remove {account?.name}?
          </p>
          <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <h3 className="text-sm font-medium text-red-300">
              Warning: This action cannot be undone
            </h3>
            <div className="mt-2 text-sm text-red-200">
              <p>
                Once deleted, this account cannot be recovered unless you have
                backed up your recovery information.
              </p>
              {isLastAccount && (
                <p className="mt-2 font-semibold">
                  ⚠️ This is your last account. Deleting it will reset your
                  entire wallet and you'll need to set it up again.
                </p>
              )}
            </div>
          </div>

          {isAccountHaveSeedPhrase && account?.source !== 'watchOnly' && (
            <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p className="text-sm text-amber-200">
                <strong>Seed Phrase Account:</strong> This account has a seed
                phrase. Make sure you have backed up your seed phrase before
                proceeding.
              </p>
            </div>
          )}

          {!isAccountHaveSeedPhrase && account?.source !== 'watchOnly' && (
            <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p className="text-sm text-amber-200">
                <strong>Private Key Account:</strong> This account uses a
                private key. Deleting it will permanently remove the private key
                from this device. Make sure you have backed up your private key
                before proceeding.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={onBack}
          className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 transition-colors duration-200"
        >
          Cancel
        </Button>
        <Button
          onClick={handleDeleteAccount}
          className="w-full bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
        >
          Remove
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default DeleteAccount;
