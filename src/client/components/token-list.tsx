import { useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import { ChainType } from '../types/wallet';
import { getTokenLogo } from '../utils/icons';
import { getNetworkIcon } from '@/utils/network-icons';

interface UnifiedToken {
  chain: ChainType;
  chainName: string;
  symbol: string;
  name: string;
  balance: string;
  balanceFormatted: number;
  usdValue: number;
  usdPrice?: number;
  contractAddress: string;
  decimals: number;
  isNative?: boolean;
  logo?: string;
}

interface TokenListProps {
  tokens: UnifiedToken[];
  onTokenClick?: (token: UnifiedToken) => void;
  className?: string;
  emptyMessage?: string;
}

interface TokenItemProps {
  token: UnifiedToken;
  onClick?: (token: UnifiedToken) => void;
}

const TokenItem = ({ token, onClick }: TokenItemProps) => {
  // Safely handle potential null/undefined values
  const safeSymbol = token.symbol || 'UNKNOWN';
  const safeName = token.name || 'Unknown Token';
  const safeChainName = token.chainName || 'Unknown Chain';
  const safeBalanceFormatted = token.balanceFormatted || 0;
  const safeValue = token.usdValue || 0;

  const tokenLogoSrc = token.logo || getTokenLogo(safeSymbol);
  const networkIconSrc = getNetworkIcon(token.chain as ChainType);

  const [tokenImageError, setTokenImageError] = useState(!tokenLogoSrc);

  const handleClick = () => {
    if (onClick) {
      onClick(token);
    }
  };

  return (
    <div
      className={`bg-[var(--card-color)] rounded-lg p-3 flex items-center gap-3 ${
        onClick
          ? 'cursor-pointer hover:bg-[var(--card-color)]/80 transition-colors'
          : ''
      }`}
      onClick={handleClick}
    >
      <div className="relative flex-shrink-0">
        <div className="size-12 flex items-center justify-center rounded-full bg-[var(--primary-color)]/10 overflow-hidden">
          {!tokenImageError && tokenLogoSrc ? (
            <img
              src={tokenLogoSrc}
              alt={safeSymbol}
              className="size-12 rounded-full object-cover p-1"
              onError={() => setTokenImageError(true)}
            />
          ) : (
            <div className="size-12 bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-lg border border-[var(--primary-color)]/20">
              {safeSymbol.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {token.chain && (
          <div className="absolute -bottom-1 -right-1 size-5 bg-[var(--background-color)] rounded-full flex items-center justify-center border border-[var(--card-color)] shadow-sm z-10">
            <img
              src={networkIconSrc}
              alt={safeChainName}
              className="size-4 rounded-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-between min-w-0">
        <div className="overflow-hidden min-w-0 flex-1 pr-3">
          <div
            className="text-base font-medium truncate w-full"
            title={safeName}
          >
            {safeName}
          </div>
          <div className="text-sm text-muted-foreground truncate w-full">
            {safeBalanceFormatted.toLocaleString(undefined, {
              maximumFractionDigits: 6,
              minimumFractionDigits: 0,
            })}{' '}
            <span className="font-medium">{safeSymbol}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-lg font-medium whitespace-nowrap">
            {formatCurrency(safeValue)}
          </span>
        </div>
      </div>
    </div>
  );
};

const TokenList = ({
  tokens,
  onTokenClick,
  className = '',
  emptyMessage = 'No tokens found',
}: TokenListProps) => {
  if (!tokens || tokens.length === 0) {
    return (
      <div
        className={`bg-[var(--card-color)] text-muted-foreground rounded-lg p-3 text-center ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {tokens.map((token, index) => (
        <TokenItem
          key={`${token.chain}-${token.contractAddress}-${index}`}
          token={token}
          onClick={onTokenClick}
        />
      ))}
    </div>
  );
};

export default TokenList;
export type { UnifiedToken, TokenListProps };
