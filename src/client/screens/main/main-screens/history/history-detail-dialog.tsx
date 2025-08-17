import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import { Button } from '@/client/components/ui';
import type { TransactionWithChain } from './types';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { ArrowUp, ArrowDown, Network } from 'lucide-react';
import { truncateAddress } from '@/client/utils/formatters';
import { NETWORK_ICONS } from '@/utils/network-icons';
import TokenLogo from '@/client/components/token-logo';
import { getChainType } from './utils/transaction-utils';
import { formatValue, formatTokenAmount } from './utils/formatting-utils';
import {
  METHOD_LABELS,
  EXPLORER_URLS,
  EXPLORER_NAMES,
  LOADING_STATES,
} from './constants';

const HistoryDetailDialog = ({
  transaction,
}: {
  transaction: TransactionWithChain;
}) => {
  const { closeDialog } = useDialogStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const userAddress = activeAccount?.eip155?.address?.toLowerCase();

  // Determine transaction direction based on method
  const isSend =
    transaction.method === 'send' || transaction.method === 'withdraw';
  const isReceive =
    transaction.method === 'receive' || transaction.method === 'deposit';
  const isSwap = transaction.method === 'swap';

  // Get method display info
  const getMethodLabel = () => {
    switch (transaction.method) {
      case 'swap':
        return METHOD_LABELS.SWAP;
      case 'send':
        return METHOD_LABELS.SEND;
      case 'withdraw':
        return METHOD_LABELS.WITHDRAW;
      case 'deposit':
        return METHOD_LABELS.DEPOSIT;
      case 'receive':
        return METHOD_LABELS.RECEIVE;
      default:
        return METHOD_LABELS.DEFAULT;
    }
  };

  // Get chain icon helper
  const getChainIcon = (chainName: string) => {
    const iconMap: Record<string, string> = {
      ethereum: NETWORK_ICONS.ethereum,
      arbitrum: NETWORK_ICONS.arbitrum,
      base: NETWORK_ICONS.base,
      hyperevm: NETWORK_ICONS.hyperevm,
    };
    return iconMap[chainName.toLowerCase()] || null;
  };

  // Get explorer URL helper
  const getExplorerUrl = (): string => {
    const baseUrl =
      EXPLORER_URLS[
        transaction.chainName.toLowerCase() as keyof typeof EXPLORER_URLS
      ] || EXPLORER_URLS.ethereum;
    return `${baseUrl}/tx/${transaction.hash}`;
  };

  // Get explorer name helper
  const getExplorerName = (): string => {
    return (
      EXPLORER_NAMES[
        transaction.chainName.toLowerCase() as keyof typeof EXPLORER_NAMES
      ] || 'View on Explorer'
    );
  };

  // Format amount based on transaction type
  const formatAmount = () => {
    if (
      transaction.isTokenTransfer &&
      transaction.tokenAmount &&
      transaction.tokenInfo
    ) {
      return `${formatTokenAmount(transaction.tokenAmount, transaction.tokenInfo.decimals)} ${transaction.tokenInfo.symbol}`;
    }
    return `${formatValue(transaction.value)} ETH`;
  };

  // Format output amount for swaps
  const formatOutputAmount = () => {
    if (
      isSwap &&
      transaction.outputTokenAmount &&
      transaction.outputTokenInfo
    ) {
      return `${formatTokenAmount(transaction.outputTokenAmount, transaction.outputTokenInfo.decimals)} ${transaction.outputTokenInfo.symbol}`;
    }
    return null;
  };

  return (
    <DialogWrapper>
      <DialogHeader title="Transaction Details" onClose={() => closeDialog()} />
      <DialogContent>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-bold">
            {getMethodLabel()}
            {transaction.isTokenTransfer && transaction.tokenInfo && (
              <>
                {transaction.tokenInfo.symbol &&
                  transaction.tokenInfo.symbol !==
                    LOADING_STATES.TOKEN_SYMBOL &&
                  ` ${transaction.tokenInfo.symbol}`}
                {(!transaction.tokenInfo.symbol ||
                  transaction.tokenInfo.symbol ===
                    LOADING_STATES.TOKEN_SYMBOL) &&
                  ' Token'}
              </>
            )}
            {!transaction.isTokenTransfer && ' ETH'}
          </h2>

          <div className="flex items-center justify-center size-24 rounded-full bg-[var(--primary-color)]/10 relative">
            {transaction.isTokenTransfer &&
            transaction.tokenInfo &&
            transaction.tokenInfo.symbol !== LOADING_STATES.TOKEN_SYMBOL ? (
              <TokenLogo
                symbol={transaction.tokenInfo.symbol || LOADING_STATES.UNKNOWN}
                existingLogo={transaction.tokenInfo.logo}
                networkId={getChainType(transaction.chainId)}
                tokenAddress={transaction.tokenInfo.address}
                className="size-24 rounded-full"
                fallbackText={transaction.tokenInfo.symbol?.charAt(0) || 'T'}
              />
            ) : (
              // ETH icon
              <div className="size-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center font-bold text-blue-600 text-2xl border border-blue-500/20">
                ETH
              </div>
            )}

            {/* Method indicator */}
            {isSend && (
              <div className="absolute top-0 right-0 size-8 bg-red-500 rounded-full flex items-center justify-center font-bold text-red-200 text-lg border border-red-500/20">
                <ArrowUp className="size-4 text-red-200" strokeWidth={3} />
              </div>
            )}
            {isReceive && (
              <div className="absolute top-0 right-0 size-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-green-200 text-lg border border-green-200/20">
                <ArrowDown className="size-4 text-green-200" strokeWidth={3} />
              </div>
            )}
          </div>

          <div className="rounded-lg overflow-hidden w-full">
            {/* From/To Address */}
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">
                {isSend ? 'To' : 'From'}
              </p>
              <div className="flex flex-col items-end">
                <p className="text-sm text-muted-foreground text-right truncate w-full">
                  {isSend
                    ? truncateAddress(transaction.to)
                    : truncateAddress(transaction.from)}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Amount</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {formatAmount()}
              </p>
            </div>

            {/* Output Amount for Swaps */}
            {isSwap && formatOutputAmount() && (
              <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
                <p className="text-base text-left font-semibold">Received</p>
                <p className="text-sm text-muted-foreground text-right truncate w-full">
                  {formatOutputAmount()}
                </p>
              </div>
            )}

            {/* Network */}
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Network</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {transaction.chainName}
              </p>
            </div>

            {/* Transaction Hash */}
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold flex-1 whitespace-nowrap">
                Transaction Hash
              </p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {truncateAddress(transaction.hash)}
              </p>
            </div>

            {/* Block Number */}
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Block Number</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {transaction.blockNumber}
              </p>
            </div>

            {/* Date */}
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Date</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {new Date(
                  parseInt(transaction.timeStamp) * 1000
                ).toLocaleString()}
              </p>
            </div>

            {/* Explorer Link */}
            <div className="w-full flex items-center justify-center bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer p-3 gap-2">
              <a
                className="text-base text-center font-semibold text-[var(--primary-color-light)]"
                href={getExplorerUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                {getExplorerName()}
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button className="w-full" onClick={() => closeDialog()}>
          Close
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default HistoryDetailDialog;
