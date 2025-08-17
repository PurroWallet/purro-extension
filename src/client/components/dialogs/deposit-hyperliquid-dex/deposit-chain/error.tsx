import { Button, DialogContent, DialogFooter } from '@/client/components/ui';
import { AlertCircle, ExternalLink, Copy } from 'lucide-react';
import useDepositChainStore from '@/client/hooks/use-deposit-chain-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { formatCurrency } from '@/client/utils/formatters';
import { useState } from 'react';

const Error = () => {
  const { closeDialog } = useDialogStore();
  const { amount, txHash, error, setStep, reset } = useDepositChainStore();
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

  const handleTryAgain = () => {
    setStep('input');
  };

  const handleClose = () => {
    reset();
    closeDialog();
  };

  return (
    <>
      <DialogContent>
        <div className="flex flex-col gap-6 items-center text-center py-4">
          {/* Error Icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full">
            <AlertCircle className="size-8 text-red-400" />
          </div>

          {/* Error Message */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold text-white">
              Transaction Failed
            </h3>
            <p className="text-gray-300">
              Your {formatCurrency(parseFloat(amount || '0'), 2, 'USDC')} deposit could not be processed.
            </p>
          </div>

          {/* Error Details */}
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-red-400 font-medium">Error Details</p>
              <p className="text-gray-300 text-left">
                {error || 'An unknown error occurred while processing your transaction.'}
              </p>
            </div>
          </div>

          {/* Transaction Details */}
          {(amount || txHash) && (
            <div className="w-full bg-[var(--card-color)] rounded-lg p-4 space-y-3">
              {amount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Amount:</span>
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(parseFloat(amount), 2, 'USDC')}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Network:</span>
                <span className="text-sm font-medium text-white">Arbitrum</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Status:</span>
                <span className="text-sm font-medium text-red-400">Failed</span>
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
          )}

          {/* Help Information */}
          <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 w-full">
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-gray-300 font-medium">Common Issues</p>
              <ul className="text-gray-400 text-left space-y-1">
                <li>• Insufficient USDC balance</li>
                <li>• Network congestion or high gas fees</li>
                <li>• Amount below minimum deposit (5 USDC)</li>
                <li>• Transaction rejected by user</li>
              </ul>
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
        <Button
          onClick={handleClose}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          Close
        </Button>
        <Button
          onClick={handleTryAgain}
          className="flex-1"
        >
          Try Again
        </Button>
      </DialogFooter>
    </>
  );
};

export default Error;
