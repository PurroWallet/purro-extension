import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui';
import useWallet from '@/client/hooks/use-wallet';

const ResetWallet = ({ onBack }: { onBack: () => void }) => {
  const { resetWallet } = useWallet();

  const handleReset = async () => {
    await resetWallet();
    // Note: onboarding window will be automatically opened by use-init hook
    // when it detects hasWallet = false, so no need to manually open it here
  };

  return (
    <DialogWrapper>
      <DialogHeader onClose={onBack} title="Reset Wallet" />
      <DialogContent>
        <div className="flex-1">
          <h3 className="text-base font-medium text-red-400 mb-2">
            ⚠️ CRITICAL WARNING
          </h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <strong>
                Are you absolutely sure you want to reset your wallet?
              </strong>
            </p>
            <p>This action will:</p>
            <ul className="list-disc list-inside ml-2 space-y-1 text-gray-400">
              <li>Permanently delete all current wallet data</li>
              <li>Remove all accounts and private keys</li>
              <li>Cannot be undone once executed</li>
              <li>Require you to set up your wallet from scratch</li>
            </ul>
            <p className="text-red-400 font-medium mt-3">
              Make sure you have backed up your seed phrase before proceeding!
            </p>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button className="w-full" onClick={onBack} variant="secondary">
          Cancel
        </Button>
        <Button className="w-full" onClick={handleReset} variant="destructive">
          Reset
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ResetWallet;
