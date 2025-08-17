import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from '@/client/components/ui';
import { DialogHeader } from '@/client/components/ui';
import { Menu } from '@/client/components/ui/menu';
import useSendTokenStore from '@/client/hooks/use-send-token-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { CheckCircle2, X, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { getAddressByDomain } from '@/client/services/hyperliquid-name-api';
import { formatTokenAmount, truncateAddress } from '@/client/utils/formatters';

// Constants for better maintainability
const EXPLORER_URLS = {
  ethereum: 'https://etherscan.io/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  base: 'https://basescan.org/tx/',
  polygon: 'https://polygonscan.com/tx/',
  optimism: 'https://optimistic.etherscan.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  hyperevm: 'https://explorer.hyperliquid.xyz/tx/',
} as const;

const NETWORK_NAMES = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum One',
  base: 'Base',
  polygon: 'Polygon',
  optimism: 'Optimism',
  bsc: 'BNB Smart Chain',
  hyperevm: 'HyperEVM',
} as const;

// Get explorer URL based on chain
const getExplorerUrl = (chain: string, txHash: string): string => {
  if (txHash === 'Processing...' || !txHash) return '';

  const baseUrl = EXPLORER_URLS[chain as keyof typeof EXPLORER_URLS];
  return baseUrl ? `${baseUrl}${txHash}` : '';
};

// Get network display name
const getNetworkDisplayName = (chain: string): string => {
  return (
    NETWORK_NAMES[chain as keyof typeof NETWORK_NAMES] ||
    chain.charAt(0).toUpperCase() + chain.slice(1)
  );
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
  const [copied, setCopied] = useState(false);

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

  const handleViewOnExplorer = () => {
    if (token && transactionHash) {
      const explorerUrl = getExplorerUrl(token.chain, transactionHash);
      if (explorerUrl) {
        window.open(explorerUrl, '_blank');
      }
    }
  };

  const handleCopyHash = () => {
    if (!transactionHash || transactionHash === 'Processing...') return;

    navigator.clipboard
      .writeText(transactionHash)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(error => {
        console.error('Failed to copy transaction hash:', error);
      });
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(recipientAddress).catch(error => {
      console.error('Failed to copy address:', error);
    });
  };

  if (!token) {
    return null;
  }

  const explorerUrl = getExplorerUrl(token.chain, transactionHash);
  const formattedAmount = formatTokenAmount(amount);

  // Prepare menu items
  const menuItems: Array<{
    label: string;
    description?: string;
    onClick?: () => void;
    arrowLeftIcon?: React.ElementType;
    itemClassName?: string;
    isCentered?: boolean;
  }> = [
    {
      label: 'Amount',
      description: `${formattedAmount} ${token.symbol}`,
    },
    {
      label: 'To Address',
      description:
        truncateAddress(recipientAddress) +
        (recipient.endsWith('.hl') ? ` (${recipient})` : ''),
      onClick: handleCopyAddress,
      arrowLeftIcon: Copy,
    },
    {
      label: 'Network',
      description: getNetworkDisplayName(token.chain),
    },
  ];

  // Add transaction hash item if available
  if (transactionHash && transactionHash !== 'Processing...') {
    menuItems.push({
      label: 'Transaction Hash',
      description: truncateAddress(transactionHash),
      onClick: handleCopyHash,
      arrowLeftIcon: copied ? Check : Copy,
    });
  }

  // Add explorer link if available
  if (explorerUrl) {
    menuItems.push({
      label: 'View on Explorer',
      itemClassName: 'text-[var(--primary-color-light)] justify-center',
      onClick: handleViewOnExplorer,
      isCentered: true,
    });
  }

  return (
    <DialogWrapper>
      <DialogHeader
        title="Transaction Successful"
        onClose={handleDone}
        icon={<X className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="flex flex-col items-center">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="mb-4"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-pulse"></div>
              <CheckCircle2 className="size-16 text-[var(--primary-color-light)] relative z-10" />
            </div>
          </motion.div>

          {/* Transaction Details Menu */}
          <Menu items={menuItems} />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button onClick={handleDone} variant="primary" className="w-full">
          Done
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default TransactionSuccess;
