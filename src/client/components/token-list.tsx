import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import { ChainType } from '../types/wallet';
import { getTokenLogo } from '../utils/icons';
import { getNetworkIcon } from '@/utils/network-icons';
import { AlertTriangle } from 'lucide-react';

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

interface ScamAlert {
  isScam: boolean;
  riskLevel: 'high' | 'medium' | 'low';
  reasons: string[];
}

const checkAlertScanToken = (
  token: UnifiedToken,
  hasTokenLogo: boolean = false
): ScamAlert => {
  const reasons: string[] = [];
  let riskLevel: 'high' | 'medium' | 'low' = 'low';

  const name = token.name?.toLowerCase() || '';
  const symbol = token.symbol?.toLowerCase() || '';

  // Debug logging for legitimate tokens that might be flagged
  if (['eth', 'usdc', 'usdt', 'arb', 'btc', 'bnb'].includes(symbol.trim())) {
    console.log('🔍 CHECKING LEGITIMATE TOKEN:', {
      originalName: token.name,
      originalSymbol: token.symbol,
      processedName: name,
      processedSymbol: symbol,
      symbolTrimmed: symbol.trim(),
      hasSpaces: symbol !== symbol.trim(),
    });
  }

  // High-risk indicators
  const highRiskPatterns = [
    // Airdrop/claim scams
    /airdrop/i,
    /claim/i,
    /distribution/i,
    /round\s*\d+/i,
    /visit.*claim/i,
    /claim.*until/i,

    // Telegram/social media indicators
    /t\.me/i,
    /telegram/i,
    /\*visit/i,
    /\*claim/i,

    // Suspicious symbols and characters
    /[✅⚡🎁💰🚀]/u,
    /[\u0400-\u04FF]/, // Cyrillic characters (like UЅDС)
    /[\u2000-\u206F]/, // General punctuation (invisible chars)

    // Impersonation attempts
    /official/i,
    /verified/i,
    /authentic/i,
  ];

  // Medium-risk indicators
  const mediumRiskPatterns = [
    // Suspicious naming patterns
    /token.*distribution/i,
    /free.*token/i,
    /bonus.*token/i,
  ];

  // Common token impersonation with suspicious spacing/characters
  // Only flag if the symbol/name is EXACTLY these tokens but with suspicious spacing
  const suspiciousTokenPatterns = [
    // Exact matches with leading/trailing spaces or multiple spaces
    /^\s+arb\s*$/i, // " ARB" or " ARB "
    /^\s*arb\s+$/i, // "ARB " or " ARB "
    /^\s+usdc\s*$/i, // " USDC" or " USDC "
    /^\s*usdc\s+$/i, // "USDC " or " USDC "
    /^\s+usdt\s*$/i, // " USDT" or " USDT "
    /^\s*usdt\s+$/i, // "USDT " or " USDT "
    /^\s+eth\s*$/i, // " ETH" or " ETH "
    /^\s*eth\s+$/i, // "ETH " or " ETH "
    /^\s+btc\s*$/i, // " BTC" or " BTC "
    /^\s*btc\s+$/i, // "BTC " or " BTC "
    /^\s+bnb\s*$/i, // " BNB" or " BNB "
    /^\s*bnb\s+$/i, // "BNB " or " BNB "
  ];

  // Check high-risk patterns
  for (const pattern of highRiskPatterns) {
    if (pattern.test(name) || pattern.test(symbol)) {
      reasons.push(`Suspicious pattern detected: ${pattern.source}`);
      riskLevel = 'high';
    }
  }

  // Check suspicious token impersonation patterns (only if not already high risk)
  if (riskLevel !== 'high') {
    for (const pattern of suspiciousTokenPatterns) {
      if (pattern.test(name) || pattern.test(symbol)) {
        reasons.push(`Suspicious token name with spacing/characters`);
        riskLevel = 'medium';
      }
    }
  }

  // Check medium-risk patterns (only if not already high risk)
  if (riskLevel !== 'high') {
    for (const pattern of mediumRiskPatterns) {
      if (pattern.test(name) || pattern.test(symbol)) {
        reasons.push(`Suspicious naming pattern: ${pattern.source}`);
        riskLevel = 'medium';
      }
    }
  }

  // Check for suspicious character combinations
  if (
    name.includes('✅') &&
    (name.includes('airdrop') || name.includes('distribution'))
  ) {
    reasons.push('Checkmark + airdrop/distribution pattern');
    riskLevel = 'high';
  }

  // Check for Cyrillic character impersonation (like UЅDС vs USDC)
  const cyrillicChars =
    name.match(/[\u0400-\u04FF]/g) || symbol.match(/[\u0400-\u04FF]/g);
  if (cyrillicChars) {
    reasons.push(`Contains Cyrillic characters: ${cyrillicChars.join(', ')}`);
    riskLevel = 'high';
  }

  // Check for URL patterns in name/symbol
  if (
    name.includes('t.me') ||
    symbol.includes('t.me') ||
    name.includes('http') ||
    symbol.includes('http')
  ) {
    reasons.push('Contains URL/social media links');
    riskLevel = 'high';
  }

  // Check for excessive special characters
  const specialCharCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > 3) {
    reasons.push(`Excessive special characters (${specialCharCount})`);
    if (riskLevel === 'low') riskLevel = 'medium';
  }

  // Check for missing logo ONLY if there are already other warning signs
  const hasOtherWarnings = reasons.length > 0;
  if (hasOtherWarnings && !hasTokenLogo) {
    reasons.push('No token logo available');
    // Upgrade risk level if missing logo + other warnings
    if (riskLevel === 'medium') {
      riskLevel = 'high';
    } else if (riskLevel === 'low') {
      riskLevel = 'medium';
    }
  }

  const isScam = reasons.length > 0;

  return {
    isScam,
    riskLevel,
    reasons,
  };
};

const TokenItem = ({ token, onClick }: TokenItemProps) => {
  // Safely handle potential null/undefined values
  const safeSymbol = token.symbol || 'UNKNOWN';
  const safeName = token.name || 'Unknown Token';
  const safeChainName = token.chainName || 'Unknown Chain';
  const safeBalanceFormatted = token.balanceFormatted || 0;
  const safeValue = token.usdValue || 0;

  const [tokenLogoSrc, setTokenLogoSrc] = useState<string | null>(
    token.logo || null
  );

  const networkIconSrc = getNetworkIcon(token.chain as ChainType);

  const [tokenImageError, setTokenImageError] = useState(!token.logo);

  // Check for scam token indicators
  const hasTokenLogo = !tokenImageError && !!tokenLogoSrc;
  const scamAlert = checkAlertScanToken(token, hasTokenLogo);

  // Load token logo asynchronously if not provided
  useEffect(() => {
    if (!token.logo) {
      getTokenLogo(safeSymbol, token.chain, token.contractAddress).then(
        logoUrl => {
          setTokenLogoSrc(logoUrl);
          setTokenImageError(false);
          if (!logoUrl) {
            setTokenImageError(true);
          }
        }
      );
    }
  }, [token.logo, safeSymbol, token.chain, token.contractAddress]);

  const handleClick = () => {
    if (onClick) {
      onClick(token);
    }
  };

  // Get scam warning styles
  const getScamWarningStyles = () => {
    if (!scamAlert.isScam) return '';

    switch (scamAlert.riskLevel) {
      case 'high':
        return 'bg-amber-500/5';
      case 'medium':
        return 'bg-yellow-500/5';
      default:
        return 'bg-orange-500/5';
    }
  };

  return (
    <div
      className={`bg-[var(--card-color)] rounded-lg p-3 flex items-center gap-3 relative ${getScamWarningStyles()} ${
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
            <div
              className={`size-12 rounded-full flex items-center justify-center font-bold text-lg ${
                scamAlert.isScam
                  ? 'bg-gradient-to-br from-orange-500/20 to-orange-500/10 text-orange-600'
                  : 'bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 text-[var(--primary-color)] border-[var(--primary-color)]/20'
              }`}
            >
              {scamAlert.isScam ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                safeSymbol.charAt(0).toUpperCase()
              )}
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

      <div className="flex-1 flex items-center justify-between min-w-0 relative">
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
