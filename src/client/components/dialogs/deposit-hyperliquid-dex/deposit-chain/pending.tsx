import { useEffect, useState } from 'react';
import { Button, DialogContent, DialogFooter } from '@/client/components/ui';
import { Clock, ExternalLink, Copy } from 'lucide-react';
import useDepositChainStore from '@/client/hooks/use-deposit-chain-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { formatCurrency } from '@/client/utils/formatters';
import { sendMessage } from '@/client/utils/extension-message-utils';

const Pending = () => {
  const { closeDialog } = useDialogStore();
  const { amount, txHash, setStep, setError } = useDepositChainStore();
  const [copied, setCopied] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Monitor transaction status
  useEffect(() => {
    if (!txHash) return;

    const checkTransactionStatus = async () => {
      try {
        const response = await sendMessage('CHECK_TRANSACTION_STATUS', {
          txHash,
          network: 'arbitrum',
        });

        // The response structure is { success: boolean, data: {...} }
        if (response.success && response.data) {
          const { confirmed, failed } = response.data;

          if (confirmed && !failed) {
            setStep('success');
          } else if (failed) {
            setError('Transaction failed');
            setStep('error');
          }
          // If neither confirmed nor failed, transaction is still pending
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
        // Don't set error state for network issues, just log and continue checking
      }
    };

    // Check immediately
    checkTransactionStatus();

    // Then check every 10 seconds
    const interval = setInterval(checkTransactionStatus, 10000);

    return () => clearInterval(interval);
  }, [txHash, setStep, setError]);

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <DialogContent>
        <div className="flex flex-col gap-6 items-center text-center py-4">
          {/* Pending Icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full">
            <Clock className="size-8 text-yellow-400 animate-pulse" />
          </div>

          {/* Pending Message */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold text-white">
              Transaction Pending
            </h3>
            <p className="text-gray-300">
              Your {formatCurrency(parseFloat(amount), 2, 'USDC')} deposit is being processed.
            </p>
            <p className="text-sm text-gray-400">
              Time elapsed: {formatTime(timeElapsed)}
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

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status:</span>
              <span className="text-sm font-medium text-yellow-400">Pending</span>
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
              <p className="text-blue-400 font-medium">Processing</p>
              <p className="text-gray-300">
                Your transaction is being confirmed on the Arbitrum network. 
                Once confirmed, your USDC will be credited to your Hyperliquid account within 1 minute.
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
        <Button
          onClick={closeDialog}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white"
        >
          Close
        </Button>
      </DialogFooter>
    </>
  );
};

export default Pending;
