import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from '@/client/components/ui';
import { DialogHeader } from '@/client/components/ui';
import useSendTokenStore from '@/client/hooks/use-send-token-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { CheckCircle, Send, X, ExternalLink } from 'lucide-react';
import { getNetworkIcon } from '@/utils/network-icons';
import { getTokenLogo } from '@/client/utils/icons';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getAddressByDomain } from '@/client/services/hyperliquid-name-api';

// Get explorer URL based on chain
const getExplorerUrl = (chain: string, txHash: string): string => {
  if (txHash === 'Processing...' || !txHash) return '';

  switch (chain) {
    case 'ethereum':
      return `https://etherscan.io/tx/${txHash}`;
    case 'arbitrum':
      return `https://arbiscan.io/tx/${txHash}`;
    case 'base':
      return `https://basescan.org/tx/${txHash}`;
    case 'polygon':
      return `https://polygonscan.com/tx/${txHash}`;
    case 'optimism':
      return `https://optimistic.etherscan.io/tx/${txHash}`;
    case 'bsc':
      return `https://bscscan.com/tx/${txHash}`;
    case 'hyperevm':
      return `https://explorer.hyperliquid.xyz/tx/${txHash}`;
    default:
      return '';
  }
};

// Get network display name
const getNetworkDisplayName = (chain: string): string => {
  switch (chain) {
    case 'ethereum':
      return 'Ethereum';
    case 'arbitrum':
      return 'Arbitrum One';
    case 'base':
      return 'Base';
    case 'polygon':
      return 'Polygon';
    case 'optimism':
      return 'Optimism';
    case 'bsc':
      return 'BNB Smart Chain';
    case 'hyperevm':
      return 'Hyperliquid EVM';
    default:
      return chain.charAt(0).toUpperCase() + chain.slice(1);
  }
};

const TransactionSuccess = () => {
  const {
    token,
    amount,
    recipient,
    transactionHash,
    setStep,
    setRecipient,
    setAmount,
    setToken,
    setTransactionHash,
  } = useSendTokenStore();
  const { closeDialog } = useDialogStore();
  const [recipientAddress, setRecipientAddress] = useState<string>(recipient);

  useEffect(() => {
    const resolveRecipientAddress = async () => {
      if (recipient.startsWith('0x')) {
        setRecipientAddress(recipient);
        return;
      }

      if (recipient.match(/^[a-zA-Z0-9-]+\.hl$/)) {
        try {
          const address = await getAddressByDomain(recipient);
          if (address) {
            setRecipientAddress(address);
            return;
          }
        } catch (error) {
          console.error('Failed to resolve domain:', error);
        }
      }

      setRecipientAddress(recipient);
    };

    resolveRecipientAddress();
  }, [recipient]);

  const handleDone = () => {
    // Clear all form data
    setRecipient('');
    setAmount('');
    setToken(null);
    setTransactionHash('');
    setStep('select');
    closeDialog();
  };

  const handleSendAnother = () => {
    // Keep the token selected but clear amount, recipient, and transaction hash
    setRecipient('');
    setAmount('');
    setTransactionHash('');
    setStep('send');
  };

  const handleViewOnExplorer = () => {
    if (token && transactionHash) {
      const explorerUrl = getExplorerUrl(token.chain, transactionHash);
      if (explorerUrl) {
        window.open(explorerUrl, '_blank');
      }
    }
  };

  if (!token) {
    return null;
  }

  const explorerUrl = getExplorerUrl(token.chain, transactionHash);
  const tokenLogoSrc = token?.logo || getTokenLogo(token?.symbol || '');

  return (
    <DialogWrapper>
      <DialogHeader
        title="Transaction Successful"
        onClose={handleDone}
        rightContent={
          <button
            onClick={handleDone}
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
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse"></div>
              <CheckCircle className="size-16 text-green-500 relative z-10" />
            </div>
          </motion.div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Transaction Sent!</h2>
            <p className="text-gray-400 text-sm">
              Your transaction has been successfully submitted to the{' '}
              {getNetworkDisplayName(token.chain)} network.
            </p>
          </div>

          {/* Transaction Details */}
          <div className="w-full bg-[var(--card-color)] rounded-lg p-4 border border-white/10 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Transaction Details
            </h3>

            <div className="space-y-3">
              {/* Amount and Token */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Amount</span>
                <div className="text-right">
                  <div className="flex items-center justify-end">
                    <img
                      src={tokenLogoSrc}
                      alt={token.symbol}
                      className="size-5 rounded-full mr-2"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.src = getTokenLogo('default');
                      }}
                    />
                    <span className="text-white font-medium">
                      {amount} {token.symbol}
                    </span>
                  </div>
                  {token.priceUsd && (
                    <div className="text-gray-400 text-sm">
                      ≈ $
                      {(
                        (parseFloat(amount) || 0) * (token.priceUsd || 0)
                      ).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">To</span>
                <span className="text-white font-mono text-sm">
                  {recipientAddress.slice(0, 6)}...
                  {recipientAddress.slice(-4)}{' '}
                  {recipient.endsWith('.hl') && (
                    <span className="text-gray-400 text-xs">({recipient})</span>
                  )}
                </span>
              </div>

              {/* Network */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Network</span>
                <div className="flex items-center">
                  <img
                    src={getNetworkIcon(token.chain)}
                    alt={getNetworkDisplayName(token.chain)}
                    className="size-5 rounded-full mr-2"
                  />
                  <span className="text-white">
                    {getNetworkDisplayName(token.chain)}
                  </span>
                </div>
              </div>

              {/* Transaction Hash */}
              {transactionHash && transactionHash !== 'Processing...' && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Transaction Hash</span>
                  <div className="flex items-center">
                    <span className="text-white font-mono text-sm mr-2">
                      {transactionHash.slice(0, 6)}...
                      {transactionHash.slice(-4)}
                    </span>
                    {explorerUrl && (
                      <button
                        onClick={handleViewOnExplorer}
                        className="size-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink className="size-3 text-blue-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Explorer Link Button */}
          {explorerUrl && (
            <Button
              onClick={handleViewOnExplorer}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="size-4 mr-2" />
              View on Explorer
            </Button>
          )}

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 w-full">
            <p className="text-blue-400 text-sm text-center">
              💡 Your transaction is being processed. It may take a few moments
              to appear in your wallet balance and transaction history.
            </p>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleSendAnother}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          <Send className="size-4 mr-2" />
          Send Another
        </Button>
        <Button onClick={handleDone} className="flex-1">
          <CheckCircle className="size-4 mr-2" />
          Done
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default TransactionSuccess;
