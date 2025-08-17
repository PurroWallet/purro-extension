import { Button, DialogContent, DialogFooter } from '@/client/components/ui';
import { CheckCircle, ExternalLink, Copy } from 'lucide-react';
import useDepositChainStore from '@/client/hooks/use-deposit-chain-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { formatCurrency } from '@/client/utils/formatters';
import { useState } from 'react';

const Success = () => {
  const { closeDialog } = useDialogStore();
  const { amount, txHash, reset } = useDepositChainStore();
  const [copied, setCopied] = useState(false);

  const handleCopyTxHash = async () => {
    if (txHash) {
      try {
        await navigator.clipboard.writeText(txHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy transaction hash:', error);
      }
    }
  };

  const handleViewOnExplorer = () => {
    if (txHash) {
      window.open(`https://arbiscan.io/tx/${txHash}`, '_blank');
    }
  };

  const handleClose = () => {
    reset();
    closeDialog();
  };

  return (
    <>
      <DialogContent>
        <div className="flex flex-col gap-6 items-center text-center py-4">
          {/* Success Icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full">
            <CheckCircle className="size-8 text-green-400" />
          </div>

          {/* Success Message */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold text-white">
              Deposit Successful!
            </h3>
            <p className="text-gray-300">
              Your {formatCurrency(parseFloat(amount), 2, 'USDC')} deposit has
              been submitted to the Hyperliquid bridge.
            </p>
          </div>

          {/* Transaction Details */}
          <div className="w-full bg-[var(--card-color)] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Amount:</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(parseFloat(amount), 2, 'USDC')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Network:</span>
              <span className="text-sm font-medium text-white">Arbitrum</span>
            </div>

            {txHash && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Transaction:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-white">
                    {txHash.slice(0, 6)}...{txHash.slice(-4)}
                  </span>
                  <button
                    onClick={handleCopyTxHash}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Copy transaction hash"
                  >
                    <Copy className="size-3 text-gray-400" />
                  </button>
                  <button
                    onClick={handleViewOnExplorer}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="View on Arbiscan"
                  >
                    <ExternalLink className="size-3 text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Information */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 w-full">
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-blue-400 font-medium">What&apos;s Next?</p>
              <p className="text-gray-300">
                Your USDC will be credited to your Hyperliquid account within 1
                minute. You can check your balance in the Hyperliquid interface.
              </p>
            </div>
          </div>

          {copied && (
            <div className="text-xs text-green-400">
              Transaction hash copied to clipboard!
            </div>
          )}
        </div>
      </DialogContent>

      <DialogFooter>
        <Button onClick={handleClose} className="w-full">
          Done
        </Button>
      </DialogFooter>
    </>
  );
};

export default Success;
