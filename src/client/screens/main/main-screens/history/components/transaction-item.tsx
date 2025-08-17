import { ArrowDown, ArrowUp, Network } from 'lucide-react';
import TokenLogo from '@/client/components/token-logo';
import { NETWORK_ICONS } from '@/utils/network-icons';
import type { TransactionWithChain, MethodInfo } from '../types';
import { getChainType } from '../utils/transaction-utils';
import {
  formatValue,
  formatTokenAmount,
  formatTransactionTime,
} from '../utils/formatting-utils';
import {
  LOADING_STATES,
  METHOD_LABELS,
  METHOD_COLORS,
  METHOD_INDICATOR_COLORS,
  LOADING_UI,
} from '../constants';

interface TransactionItemProps {
  transaction: TransactionWithChain;
  onTransactionClick: (transaction: TransactionWithChain) => void;
}

// Helper function to get method display info with 3 color categories
const getMethodInfo = (method: string): MethodInfo => {
  switch (method) {
    case 'swap':
      return {
        label: METHOD_LABELS.SWAP,
        color: METHOD_COLORS.SWAP,
        icon: ArrowUp,
      };
    case 'send':
      return {
        label: METHOD_LABELS.SEND,
        color: METHOD_COLORS.SEND,
        icon: ArrowUp,
      };
    case 'withdraw':
      return {
        label: METHOD_LABELS.WITHDRAW,
        color: METHOD_COLORS.WITHDRAW,
        icon: ArrowUp,
      };
    case 'deposit':
      return {
        label: METHOD_LABELS.DEPOSIT,
        color: METHOD_COLORS.DEPOSIT,
        icon: ArrowDown,
      };
    case 'receive':
      return {
        label: METHOD_LABELS.RECEIVE,
        color: METHOD_COLORS.RECEIVE,
        icon: ArrowDown,
      };
    default:
      return {
        label: METHOD_LABELS.DEFAULT,
        color: METHOD_COLORS.DEFAULT,
        icon: ArrowUp,
      };
  }
};

// Helper function to get chain icon
const getChainIcon = (chainName: string) => {
  return NETWORK_ICONS[chainName as keyof typeof NETWORK_ICONS] || '';
};

export const TransactionItem = ({
  transaction,
  onTransactionClick,
}: TransactionItemProps) => {
  const methodInfo = getMethodInfo(transaction.method);
  const MethodIcon = methodInfo.icon;

  // Check if transaction is still loading
  const isTokenLoading =
    transaction.isTokenTransfer &&
    transaction.tokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL;
  const isSwapLoading =
    transaction.method === 'swap' &&
    (transaction.tokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL ||
      transaction.outputTokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL);
  const isLoading = isTokenLoading || isSwapLoading;

  // Handle click with loading check
  const handleClick = () => {
    if (!isLoading) {
      onTransactionClick(transaction);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg transition-colors duration-200 ${
        isLoading
          ? `${LOADING_UI.OPACITY} ${LOADING_UI.CURSOR}`
          : 'hover:bg-[var(--card-color)]/80 cursor-pointer'
      }`}
      onClick={handleClick}
    >
      {/* Special UI for Swap transactions */}
      {transaction.method === 'swap' && transaction.outputTokenInfo ? (
        <div className="flex items-center relative mr-4 pb-4">
          {/* Input Token Icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary-color)]/10 relative">
            {transaction.tokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL ? (
              <div
                className={`${LOADING_UI.SPINNER_SIZE.SMALL} border border-[var(--primary-color)] border-t-transparent rounded-full animate-spin`}
              ></div>
            ) : (
              <TokenLogo
                symbol={transaction.tokenInfo?.symbol || LOADING_STATES.UNKNOWN}
                existingLogo={transaction.tokenInfo?.logo}
                networkId={getChainType(transaction.chainId)}
                tokenAddress={transaction.tokenInfo?.address}
                className="w-8 h-8 rounded-full"
                fallbackText={transaction.tokenInfo?.symbol?.charAt(0) || 'T'}
              />
            )}
          </div>

          {/* Output Token Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary-color)]/10 absolute top-3 left-3">
            {transaction.outputTokenInfo?.symbol ===
            LOADING_STATES.TOKEN_SYMBOL ? (
              <div
                className={`${LOADING_UI.SPINNER_SIZE.SMALL} border border-green-600 border-t-transparent rounded-full animate-spin`}
              ></div>
            ) : (
              <TokenLogo
                symbol={
                  transaction.outputTokenInfo?.symbol || LOADING_STATES.UNKNOWN
                }
                existingLogo={transaction.outputTokenInfo?.logo}
                networkId={getChainType(transaction.chainId)}
                tokenAddress={transaction.outputTokenInfo?.address}
                className="w-8 h-8 rounded-full"
                fallbackText={
                  transaction.outputTokenInfo?.symbol?.charAt(0) || 'T'
                }
              />
            )}
          </div>
        </div>
      ) : (
        /* Regular UI for non-swap transactions */
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary-color)]/10 relative me-1">
          {transaction.isTokenTransfer ? (
            transaction.tokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL ? (
              <div
                className={`${LOADING_UI.SPINNER_SIZE.MEDIUM} border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin`}
              ></div>
            ) : (
              <TokenLogo
                symbol={transaction.tokenInfo?.symbol || LOADING_STATES.UNKNOWN}
                existingLogo={transaction.tokenInfo?.logo}
                networkId={getChainType(transaction.chainId)}
                tokenAddress={transaction.tokenInfo?.address}
                className="w-10 h-10 rounded-full"
                fallbackText={transaction.tokenInfo?.symbol?.charAt(0) || 'T'}
              />
            )
          ) : (
            // ETH icon
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center font-bold text-blue-600 text-sm border border-blue-500/20">
              <TokenLogo
                symbol={'eth'}
                className="w-8 h-8 rounded-full"
                fallbackText={'T'}
              />
            </div>
          )}

          {/* Method indicator */}
          <div
            className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center ${
              transaction.method === 'swap'
                ? METHOD_INDICATOR_COLORS.SWAP
                : transaction.method === 'send' ||
                    transaction.method === 'withdraw'
                  ? METHOD_INDICATOR_COLORS.SEND
                  : transaction.method === 'receive' ||
                      transaction.method === 'deposit'
                    ? METHOD_INDICATOR_COLORS.DEPOSIT
                    : METHOD_INDICATOR_COLORS.DEFAULT
            }`}
          >
            <MethodIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Transaction Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 relative">
          <p className={`font-semibold text-sm ${methodInfo.color}`}>
            {methodInfo.label}
          </p>
          {isLoading && (
            <span className="text-xs text-muted-foreground">
              {LOADING_UI.LOADING_TEXT}
            </span>
          )}
        </div>

        {/* Token/Asset name - Special handling for swaps */}
        {transaction.method === 'swap' && transaction.outputTokenInfo ? (
          <p className="text-sm font-medium text-foreground mb-1">
            {transaction.tokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL ||
            transaction.outputTokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL
              ? LOADING_STATES.SWAP_INFO
              : `${transaction.tokenInfo?.symbol || LOADING_STATES.UNKNOWN} → ${transaction.outputTokenInfo?.symbol || LOADING_STATES.UNKNOWN}`}
          </p>
        ) : (
          <p className="text-sm font-medium text-foreground mb-1">
            {transaction.isTokenTransfer && transaction.tokenInfo
              ? transaction.tokenInfo.symbol === LOADING_STATES.TOKEN_SYMBOL
                ? LOADING_STATES.TOKEN_INFO
                : `${transaction.tokenInfo.symbol} (${transaction.tokenInfo.name})`
              : 'Ethereum (ETH)'}
          </p>
        )}

        {/* Transaction time only */}
        <p className="text-xs text-muted-foreground">
          {formatTransactionTime(transaction.timeStamp)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex flex-col items-end">
        {transaction.method === 'swap' && transaction.outputTokenInfo ? (
          /* Special swap amount display */
          <div className="space-y-1">
            <p className="font-semibold text-sm text-red-400">
              -
              {transaction.tokenAmount &&
              transaction.tokenInfo &&
              transaction.tokenInfo.symbol !== LOADING_STATES.TOKEN_SYMBOL
                ? `${formatTokenAmount(transaction.tokenAmount, transaction.tokenInfo.decimals)} ${transaction.tokenInfo.symbol}`
                : transaction.tokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL
                  ? LOADING_STATES.AMOUNT
                  : `${formatValue(transaction.value)} ETH`}
            </p>
            <p className="font-semibold text-sm text-green-400">
              +
              {transaction.outputTokenAmount &&
              transaction.outputTokenInfo &&
              transaction.outputTokenInfo.symbol !== LOADING_STATES.TOKEN_SYMBOL
                ? `${formatTokenAmount(transaction.outputTokenAmount, transaction.outputTokenInfo.decimals)} ${transaction.outputTokenInfo.symbol}`
                : transaction.outputTokenInfo?.symbol ===
                    LOADING_STATES.TOKEN_SYMBOL
                  ? LOADING_STATES.AMOUNT
                  : LOADING_STATES.UNKNOWN}
            </p>
          </div>
        ) : (
          /* Regular amount display */
          <p className={`font-semibold text-sm ${methodInfo.color}`}>
            {transaction.method === 'send' || transaction.method === 'withdraw'
              ? '-'
              : transaction.method === 'receive' ||
                  transaction.method === 'deposit'
                ? '+'
                : ''}
            {transaction.isTokenTransfer &&
            transaction.tokenAmount &&
            transaction.tokenInfo &&
            transaction.tokenInfo.symbol !== LOADING_STATES.TOKEN_SYMBOL
              ? `${formatTokenAmount(transaction.tokenAmount, transaction.tokenInfo.decimals)} ${transaction.tokenInfo.symbol}`
              : transaction.isTokenTransfer &&
                  transaction.tokenInfo?.symbol === LOADING_STATES.TOKEN_SYMBOL
                ? LOADING_STATES.AMOUNT
                : `${formatValue(transaction.value)} ETH`}
          </p>
        )}
        {/* Chain badge */}
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs text-muted-foreground capitalize">
            {transaction.chainName}
          </p>
          <div className="size-4 rounded-full bg-[var(--background-color)] flex items-center justify-center">
            {getChainIcon(transaction.chainName) ? (
              <img
                src={getChainIcon(transaction.chainName)!}
                alt={transaction.chainName}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <Network className="w-2 h-2 text-[var(--primary-color)]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
