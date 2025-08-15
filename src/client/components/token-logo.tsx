import React from 'react';
import { useTokenLogo } from '@/client/hooks/use-token-logo';
import { ChainType } from '@/client/types/wallet';

interface TokenLogoProps {
  symbol: string;
  existingLogo?: string;
  networkId?: ChainType;
  tokenAddress?: string;
  className?: string;
  alt?: string;
  fallbackText?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const TokenLogo: React.FC<TokenLogoProps> = ({
  symbol,
  existingLogo,
  networkId,
  tokenAddress,
  className = 'size-8 rounded-full',
  alt,
  fallbackText,
  onError,
}) => {
  const { logoSrc } = useTokenLogo(
    existingLogo ? undefined : symbol,
    networkId,
    tokenAddress
  );

  const finalLogoSrc = existingLogo || logoSrc;
  const displayText = fallbackText || symbol.slice(0, 2).toUpperCase();

  if (finalLogoSrc) {
    return (
      <img
        src={finalLogoSrc}
        alt={alt || symbol}
        className={className}
        onError={onError}
      />
    );
  }

  return (
    <span className="text-xs font-medium text-gray-400">{displayText}</span>
  );
};

export default TokenLogo;
