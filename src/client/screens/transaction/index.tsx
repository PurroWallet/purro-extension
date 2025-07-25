import { AccountIcon, AccountName } from "@/client/components/account";
import AccountSheet from "@/client/components/account-sheet/account-sheet";
import { LoadingDisplay, LockDisplay } from "@/client/components/display";
import { Dialog, DialogFooter } from "@/client/components/ui";
import { Button } from "@/client/components/ui/button";
import useAccountSheetStore from "@/client/hooks/use-account-sheet-store";
import useInit from "@/client/hooks/use-init";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { sendMessage } from "@/client/utils/extension-message-utils";
import { formatTime, getTimeColor } from "@/client/utils/formatters";
import {
  Check,
  Clock,
  Send,
  Globe,
  Shield,
  X,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Fuel,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

export interface TransactionRequest {
  to?: string;
  from?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  type?: string;
  chainId?: string;
}

export interface TransactionRequestData {
  origin: string;
  favicon?: string;
  title?: string;
  transaction: TransactionRequest;
  timestamp: number;
}

const TIMEOUT_DURATION = 5 * 60; // 5 minutes in seconds

// Error retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const approveTransaction = async (
  origin: string,
  transaction: TransactionRequest
) => {
  return await sendMessage("ETH_APPROVE_TRANSACTION", { origin, transaction });
};

const rejectTransaction = async (origin: string) => {
  return await sendMessage("ETH_REJECT_TRANSACTION", { origin });
};

const formatAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatValue = (value?: string) => {
  if (!value || value === "0") return "0";
  try {
    // Convert wei to ETH
    const ethValue = parseFloat(value);
    if (ethValue < 0.0001) {
      return ethValue.toExponential(4);
    }
    return ethValue.toFixed(6);
  } catch {
    return value;
  }
};

const formatGas = (gas?: string) => {
  if (!gas) return "0";
  try {
    return parseInt(gas, 16).toLocaleString();
  } catch {
    return gas;
  }
};

const formatGasPrice = (gasPrice?: string) => {
  if (!gasPrice) return "0";
  try {
    // Convert wei to gwei
    const gwei = parseInt(gasPrice, 16) / 1e9;
    return gwei.toFixed(2) + " Gwei";
  } catch {
    return gasPrice;
  }
};

export const TransactionScreen = () => {
  useInit();

  const { activeAccount } = useWalletStore();
  const [transactionRequest, setTransactionRequest] =
    useState<TransactionRequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(TIMEOUT_DURATION);
  const { open: openAccountSheet } = useAccountSheetStore();

  // Check if current account is watch-only
  const isWatchOnlyAccount = activeAccount?.source === "watchOnly";

  useEffect(() => {
    // Get transaction request from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const origin = urlParams.get("origin");
    const favicon = urlParams.get("favicon");
    const title = urlParams.get("title");
    const transactionParam = urlParams.get("transaction");

    if (origin && transactionParam) {
      try {
        const transaction = JSON.parse(decodeURIComponent(transactionParam));
        setTransactionRequest({
          origin,
          favicon: favicon || undefined,
          title: title || undefined,
          transaction,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Failed to parse transaction data:", error);
        setError("Invalid transaction data");
      }
    }
  }, []);

  useEffect(() => {
    if (!transactionRequest) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-close when timeout
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [transactionRequest]);

  const handleApprove = async () => {
    if (!transactionRequest || !activeAccount) return;

    setLoading(true);
    setError(null);

    try {
      console.log(
        "🔄 Approving transaction for:",
        transactionRequest.origin,
        "transaction:",
        transactionRequest.transaction
      );

      // Send approval to background script - transaction will be sent there
      const result = await approveTransaction(
        transactionRequest.origin,
        transactionRequest.transaction
      );

      console.log("✅ Transaction approval result:", result);

      // Small delay to ensure message is processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Close popup
      window.close();
    } catch (error) {
      console.error("❌ Error approving transaction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);

      // Check if it's a retryable error
      const isRetryableError =
        errorMessage.includes("session") ||
        errorMessage.includes("unlock") ||
        errorMessage.includes("storage") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("gas") ||
        errorMessage.includes("network");

      if (isRetryableError && retryCount < MAX_RETRIES) {
        console.log(
          `🔄 Retryable error detected, attempting retry ${
            retryCount + 1
          }/${MAX_RETRIES}`
        );
        setRetryCount((prev) => prev + 1);

        // Auto-retry after delay
        setTimeout(() => {
          handleApprove();
        }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      }

      // Don't close popup on error so user can retry or see error message
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!transactionRequest) return;

    try {
      // Send rejection to background script
      await rejectTransaction(transactionRequest.origin);

      // Close popup
      window.close();
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      // Still close popup even on rejection error
      window.close();
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    handleApprove();
  };

  if (!transactionRequest) {
    return (
      <main className="bg-[var(--background-color)] flex flex-col h-screen">
        <LoadingDisplay />
      </main>
    );
  }

  const domain = new URL(transactionRequest.origin).hostname;
  const transaction = transactionRequest.transaction;

  // Watch-Only Overlay Screen
  if (isWatchOnlyAccount) {
    return (
      <main className="bg-[var(--background-color)] flex flex-col h-screen">
        <LockDisplay />
        <Dialog />
        <AccountSheet />

        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-white/10">
          <div
            className="flex items-center gap-2 pr-3 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
            onClick={openAccountSheet}
          >
            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
              <AccountIcon icon={activeAccount?.icon} alt="Account" />
            </div>
            <AccountName name={activeAccount?.name} />
          </div>
        </div>

        {/* Site Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {transactionRequest.favicon ? (
              <img
                src={transactionRequest.favicon}
                alt="Site favicon"
                className="size-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Globe className="size-8 text-[var(--primary-color)]" />
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Send Transaction</h1>
              <p className="text-sm text-white/60">{domain}</p>
            </div>
          </div>
        </div>

        {/* Watch-Only Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="mb-6">
              <Shield className="size-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                Watch-Only Wallet
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                This is a watch-only wallet. You can view balances and
                transaction history, but cannot send transactions or sign
                messages.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-xs text-yellow-200">
                Only the private key holder can approve transactions from this
                address.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Button
            onClick={() => window.close()}
            className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80"
          >
            <X className="size-4" />
            Close
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[var(--background-color)] flex flex-col h-screen">
      <LockDisplay />
      <Dialog />
      <AccountSheet />

      <div className="p-3 flex items-center justify-between border-b border-white/10">
        <div
          className="flex items-center gap-2 pr-3 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
          onClick={openAccountSheet}
        >
          <div className="size-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
            <AccountIcon icon={activeAccount?.icon} alt="Account" />
          </div>
          <AccountName name={activeAccount?.name} />
        </div>
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {transactionRequest.favicon ? (
            <img
              src={transactionRequest.favicon}
              alt="Site favicon"
              className="size-8 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe className="size-8 text-[var(--primary-color)]" />
          )}
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Send Transaction</h1>
            <p className="text-sm text-white/60">{domain}</p>
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${getTimeColor(
              timeLeft
            )}`}
          >
            <Clock className="size-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="size-5 text-red-400" />
              <span className="text-base font-medium text-red-400">
                Transaction Failed
              </span>
            </div>
            <p className="text-sm text-red-200 mb-3">{error}</p>
            {retryCount < MAX_RETRIES && (
              <Button
                onClick={handleRetry}
                disabled={loading}
                className="bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30"
              >
                <RefreshCw className="size-4" />
                Retry ({retryCount}/{MAX_RETRIES})
              </Button>
            )}
          </div>
        )}

        <div className="bg-[var(--primary-color)]/20 border border-[var(--primary-color)]/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-5 text-[var(--primary-color)]" />
            <span className="text-base font-medium">Transaction Request</span>
          </div>
          <p className="text-sm text-white/80">
            This site is requesting to send a transaction from your wallet.
            Review the details carefully before confirming.
          </p>
        </div>

        {/* Transaction Details */}
        <div className="bg-[var(--card-color)] border border-white/10 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Send className="size-5 text-[var(--primary-color)]" />
            <span className="text-base font-medium">Transaction Details</span>
          </div>

          {/* From/To Addresses */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">From:</span>
              <span className="text-sm font-mono">
                {formatAddress(transaction.from || "")}
              </span>
            </div>
            <div className="flex items-center justify-center py-2">
              <ArrowRight className="size-4 text-white/40" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">To:</span>
              <span className="text-sm font-mono">
                {formatAddress(transaction.to || "")}
              </span>
            </div>
          </div>

          {/* Value */}
          {transaction.value && transaction.value !== "0" && (
            <div className="flex items-center justify-between py-2 border-t border-white/10">
              <span className="text-sm text-white/60">Amount:</span>
              <span className="text-sm font-bold text-[var(--primary-color)]">
                {formatValue(transaction.value)} ETH
              </span>
            </div>
          )}

          {/* Gas Information */}
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="size-4 text-yellow-400" />
              <span className="text-sm font-medium">Gas Details</span>
            </div>

            <div className="space-y-2 text-sm">
              {transaction.gas && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Gas Limit:</span>
                  <span className="font-mono">
                    {formatGas(transaction.gas)}
                  </span>
                </div>
              )}

              {transaction.gasPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Gas Price:</span>
                  <span className="font-mono">
                    {formatGasPrice(transaction.gasPrice)}
                  </span>
                </div>
              )}

              {transaction.maxFeePerGas && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Max Fee:</span>
                  <span className="font-mono">
                    {formatGasPrice(transaction.maxFeePerGas)}
                  </span>
                </div>
              )}

              {transaction.maxPriorityFeePerGas && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Priority Fee:</span>
                  <span className="font-mono">
                    {formatGasPrice(transaction.maxPriorityFeePerGas)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Data field if present */}
          {transaction.data && transaction.data !== "0x" && (
            <div className="border-t border-white/10 pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Data:</span>
                <span className="text-xs text-white/40">
                  {transaction.data.length} bytes
                </span>
              </div>
              <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                <pre className="text-xs text-white/70 whitespace-pre-wrap break-all font-mono">
                  {transaction.data.length > 100
                    ? `${transaction.data.slice(0, 100)}...`
                    : transaction.data}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="flex-col gap-2">
        <div className="text-sm text-white/60 text-center">
          Double-check the recipient address and amount
          <br />
          Transactions on blockchain are irreversible
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={handleReject}
            disabled={loading}
            className="bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80"
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading || !activeAccount}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                {retryCount > 0
                  ? `Retrying... (${retryCount}/${MAX_RETRIES})`
                  : "Sending..."}
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send Transaction
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </main>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<TransactionScreen />);
}
