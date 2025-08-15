import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from "@/client/components/ui";
import { DialogHeader } from "@/client/components/ui";
import useDialogStore from "@/client/hooks/use-dialog-store";
import useSwapStore from "@/client/hooks/use-swap-store";
import { CheckCircle, Repeat, X, ExternalLink, Copy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { getTokenLogo } from "@/client/utils/icons";
import { useHlPortfolioData } from "@/client/hooks/use-hyperliquid-portfolio";

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
  chainId = "0x3e7" // Default to HyperEVM
}: SwapSuccessProps) => {
  const { closeDialog } = useDialogStore();
  const { resetAmounts } = useSwapStore();
  const [copied, setCopied] = useState(false);
  const { refetchAll } = useHlPortfolioData()

  const getExplorerUrl = (hash: string, chainId: string) => {
    switch (chainId) {
      case "0x1": // Ethereum
        return `https://etherscan.io/tx/${hash}`;
      case "0xa4b1": // Arbitrum
        return `https://arbiscan.io/tx/${hash}`;
      case "0x2105": // Base
        return `https://basescan.org/tx/${hash}`;
      case "0x3e7": // HyperEVM
        return `https://purrsec.com/tx/${hash}`;
      default:
        return `https://purrsec.com/tx/${hash}`;
    }
  };

  const handleDone = () => {
    resetAmounts();
    closeDialog();
    refetchAll();
  };

  const handleSwapAgain = () => {
    closeDialog();
    // Don't reset amounts to allow easy re-swapping
  };

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(transactionHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy transaction hash:", error);
    }
  };

  const handleViewExplorer = () => {
    const url = getExplorerUrl(transactionHash, chainId);
    window.open(url, '_blank');
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Swap Successful"
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
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="size-16 bg-green-500/20 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="size-8 text-green-400" />
          </motion.div>

          {/* Swap Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full space-y-4"
          >
            {/* Token Swap Visual */}
            <div className="flex items-center justify-center space-x-4 py-4">
              {/* From Token */}
              <div className="flex flex-col items-center space-y-2">
                <div className="size-12 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                  {tokenIn.logo || getTokenLogo(tokenIn.symbol) ? (
                    <img
                      src={tokenIn.logo || getTokenLogo(tokenIn.symbol)}
                      alt={tokenIn.symbol}
                      className="size-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      {tokenIn.symbol.slice(0, 3)}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">{amountIn}</p>
                  <p className="text-xs text-gray-400">{tokenIn.symbol}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <motion.div
                  initial={{ x: -10 }}
                  animate={{ x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="px-3 py-1 bg-gray-800 rounded-full">
                    <span className="text-xs text-gray-400">→</span>
                  </div>
                </motion.div>
              </div>

              {/* To Token */}
              <div className="flex flex-col items-center space-y-2">
                <div className="size-12 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                  {tokenOut.logo || getTokenLogo(tokenOut.symbol) ? (
                    <img
                      src={tokenOut.logo || getTokenLogo(tokenOut.symbol)}
                      alt={tokenOut.symbol}
                      className="size-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      {tokenOut.symbol.slice(0, 3)}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">{amountOut}</p>
                  <p className="text-xs text-gray-400">{tokenOut.symbol}</p>
                </div>
              </div>
            </div>

            {/* Transaction Hash */}
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Transaction Hash</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyHash}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Copy transaction hash"
                    >
                      <Copy className="size-3 text-gray-400" />
                    </button>
                    <button
                      onClick={handleViewExplorer}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink className="size-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs text-white font-mono bg-gray-900 px-2 py-1 rounded flex-1 truncate">
                    {transactionHash}
                  </code>
                  {copied && (
                    <span className="text-xs text-green-400">Copied!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Network Info */}
            <div className="text-center">
              <p className="text-xs text-gray-400">
                Transaction confirmed on{" "}
                <span className="text-blue-400">
                  {chainId === "0x3e7" ? "HyperEVM" : 
                   chainId === "0x1" ? "Ethereum" :
                   chainId === "0xa4b1" ? "Arbitrum" :
                   chainId === "0x2105" ? "Base" : "Unknown Network"}
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </DialogContent>

      <DialogFooter>
        <div className="flex flex-col space-y-3 w-full">
          <Button
            onClick={handleSwapAgain}
            variant="secondary"
            className="w-full flex items-center justify-center space-x-2"
          >
            <Repeat className="size-4" />
            <span>Swap Again</span>
          </Button>
          <Button
            onClick={handleDone}
            variant="primary"
            className="w-full"
          >
            Done
          </Button>
        </div>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default SwapSuccess;
