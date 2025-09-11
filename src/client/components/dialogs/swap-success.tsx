import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from '@/client/components/ui';
import { DialogHeader } from '@/client/components/ui';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useSwapStore from '@/client/hooks/use-swap-store';
import { Copy, XIcon, MoveRight, CheckCircle2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import TokenLogo from '@/client/components/token-logo';
import { useHlPortfolioData } from '@/client/hooks/use-hyperliquid-portfolio';
import { formatTokenAmount, truncateAddress } from '@/client/utils/formatters';
import { Menu } from '../ui/menu';

interface SwapSuccessProps {
  transactionHash: string;
  tokenIn: any;
  tokenOut: any;
  amountIn: string;
  amountOut: string;
  chainId?: string;
}

const SwapSuccess = ({
  transactionHash,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  chainId = '0x3e7', // Default to HyperEVM
}: SwapSuccessProps) => {
  const { closeDialog } = useDialogStore();
  const { resetAmounts } = useSwapStore();
  const [copied, setCopied] = useState(false);
  const { refetchAll } = useHlPortfolioData();

  const getExplorerUrl = (hash: string, chainId: string) => {
    switch (chainId) {
      case '0x1': // Ethereum
        return `https://etherscan.io/tx/${hash}`;
      case '0xa4b1': // Arbitrum
        return `https://arbiscan.io/tx/${hash}`;
      case '0x2105': // Base
        return `https://basescan.org/tx/${hash}`;
      case '0x3e7': // HyperEVM
        return `https://hyperevmscan.io/tx/${hash}`;
      default:
        return `https://hyperevmscan.io/tx/${hash}`;
    }
  };

  const getNetworkName = (chainId: string) => {
    switch (chainId) {
      case '0x1':
        return 'Ethereum';
      case '0xa4b1':
        return 'Arbitrum';
      case '0x2105':
        return 'Base';
      case '0x3e7':
        return 'HyperEVM';
      default:
        return 'Unknown Network';
    }
  };

  const handleDone = () => {
    resetAmounts();
    closeDialog();
    refetchAll();
  };

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(transactionHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy transaction hash:', error);
    }
  };

  const handleViewExplorer = () => {
    const url = getExplorerUrl(transactionHash, chainId);
    window.open(url, '_blank');
  };

  // Format the token amounts to prevent UI breaking
  const formattedAmountIn = formatTokenAmount(amountIn);
  const formattedAmountOut = formatTokenAmount(amountOut);

  return (
    <DialogWrapper>
      <DialogHeader
        title="Swap Successful"
        onClose={handleDone}
        icon={<XIcon className="size-4 text-white" />}
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
            className="flex items-center justify-center my-4"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-pulse"></div>
              <CheckCircle2 className="size-16 text-[var(--primary-color-light)] relative z-10" />
            </div>
          </motion.div>

          {/* Token Swap Visual */}
          <div className="flex items-center justify-center space-x-4 my-6">
            {/* From Token */}
            <div className="flex flex-col items-center space-y-2">
              <div className="size-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                <TokenLogo
                  symbol={tokenIn.symbol}
                  existingLogo={tokenIn.logo}
                  className="size-9 rounded-full"
                  fallbackText={tokenIn.symbol.slice(0, 3)}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {formattedAmountIn}
                </p>
                <p className="text-xs text-gray-400">{tokenIn.symbol}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="p-2 bg-gray-800 rounded-full flex items-center justify-center">
              <MoveRight className="size-4 text-white" />
            </div>

            {/* To Token */}
            <div className="flex flex-col items-center space-y-2">
              <div className="size-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                <TokenLogo
                  symbol={tokenOut.symbol}
                  existingLogo={tokenOut.logo}
                  className="size-9 rounded-full"
                  fallbackText={tokenOut.symbol.slice(0, 3)}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {formattedAmountOut}
                </p>
                <p className="text-xs text-gray-400">{tokenOut.symbol}</p>
              </div>
            </div>
          </div>

          <Menu
            items={[
              {
                label: 'Network',
                description: getNetworkName(chainId),
              },
              {
                label: 'Transaction Hash',
                description: truncateAddress(transactionHash),
                onClick: handleCopyHash,
                arrowLeftIcon: copied ? Check : Copy,
              },
              {
                label: 'View on explorer',
                itemClassName:
                  'text-[var(--primary-color-light)] justify-center',
                onClick: handleViewExplorer,
                isCentered: true,
              },
            ]}
          />
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

export default SwapSuccess;
