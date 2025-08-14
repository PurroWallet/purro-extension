import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from '@/client/components/ui';
import { DialogHeader } from '@/client/components/ui';
import useDepositTransferStore from '@/client/hooks/use-deposit-transfer-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { CheckCircle, Repeat, X } from 'lucide-react';
import { motion } from 'motion/react';

const TransactionSuccess = () => {
  const { amount, isFromSpot, setStep, setAmount } = useDepositTransferStore();
  const { closeDialog } = useDialogStore();

  const fromLabel = isFromSpot ? 'Hyperliquid Spot' : 'Hyperliquid Perps';
  const toLabel = isFromSpot ? 'Hyperliquid Perps' : 'Hyperliquid Spot';

  const handleDone = () => {
    setAmount('');
    setStep('transfer');
    closeDialog();
  };

  const handleTransferAgain = () => {
    setAmount('');
    setStep('transfer');
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Transfer Successful"
        onClose={handleDone}
        rightContent={
          <button
            onClick={closeDialog}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-4 text-white" />
          </button>
        }
      />
      <DialogContent>
        <div className="flex flex-col items-center space-y-6">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse" />
              <CheckCircle className="size-16 text-green-500 relative z-10" />
            </div>
          </motion.div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Transfer Sent!</h2>
            <p className="text-gray-400 text-sm">
              Your transfer has been submitted on Hyperliquid.
            </p>
          </div>

          {/* Transfer Details */}
          <div className="w-full bg-[var(--card-color)] rounded-lg p-4 border border-white/10 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-3">Details</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-medium">{amount} USDC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">From</span>
                <span className="text-white">{fromLabel}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">To</span>
                <span className="text-white">{toLabel}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Network</span>
                <span className="text-white">Hyperliquid DEX</span>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 w-full">
            <p className="text-blue-400 text-sm text-center">
              Your transfer may take a moment to reflect in balances.
            </p>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleTransferAgain}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          <Repeat className="size-4 mr-2" />
          Again
        </Button>
        <Button onClick={handleDone} className="flex-1">
          Done
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default TransactionSuccess;
