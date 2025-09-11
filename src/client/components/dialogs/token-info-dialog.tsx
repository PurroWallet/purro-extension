import React, { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
  DialogFooter,
  Button,
} from '@/client/components/ui';
import { Menu } from '@/client/components/ui/menu';
import {
  ExternalLink,
  XIcon,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  BarChart3,
  Coins,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UnifiedToken } from '@/client/components/token-list';
import { formatCurrency } from '@/client/utils/formatters';
import { getNetworkIcon } from '@/utils/network-icons';
import TokenLogo from '@/client/components/token-logo';
import {
  useDetailedTokenInfo,
  formatTokenNumber,
  getTokenExplorerUrl,
} from '@/client/hooks/use-detailed-token-info';
import useMainScreenStore from '@/client/hooks/use-main-screen-store';
import useSwapStore from '@/client/hooks/use-swap-store';

interface ScamAlert {
  isScam: boolean;
  riskLevel: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface TokenInfoDialogProps {
  token: UnifiedToken;
  onClose: () => void;
}

const checkAlertScanToken = (
  token: UnifiedToken,
  hasTokenLogo: boolean = false
): ScamAlert => {
  const reasons: string[] = [];
  let riskLevel: 'high' | 'medium' | 'low' = 'low';

  const name = token.name?.toLowerCase() || '';
  const symbol = token.symbol?.toLowerCase() || '';

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

  // Check high-risk patterns
  for (const pattern of highRiskPatterns) {
    if (pattern.test(name) || pattern.test(symbol)) {
      reasons.push(`Suspicious pattern detected: ${pattern.source}`);
      riskLevel = 'high';
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

const TokenInfoDialog: React.FC<TokenInfoDialogProps> = ({
  token,
  onClose,
}) => {
  const {
    data: detailedInfo,
    isLoading,
    error,
  } = useDetailedTokenInfo({
    chain: token.chain,
    contractAddress: token.contractAddress,
    enabled: true,
  });

  const { setMainScreen } = useMainScreenStore();
  const { setTokenIn, reset } = useSwapStore();

  // Check if token is on HyperEVM network
  const isHyperEvmToken = token.chain === 'hyperevm';

  // Check for scam token indicators
  const hasTokenLogo = !!token.logo;
  const scamAlert = checkAlertScanToken(token, hasTokenLogo);

  // Collapsible state for security warning
  const [isWarningExpanded, setIsWarningExpanded] = useState(false);

  // Log scam detection for debugging
  if (scamAlert.isScam) {
    console.warn('🚨 POTENTIAL SCAM TOKEN IN DIALOG:', {
      name: token.name,
      symbol: token.symbol,
      riskLevel: scamAlert.riskLevel,
      reasons: scamAlert.reasons,
      hasLogo: hasTokenLogo,
      contractAddress: token.contractAddress,
      chain: token.chain,
    });
  }

  // Handle swap button click
  const handleSwapClick = () => {
    // Reset swap store to clear any previous state
    reset();

    // Set the current token as tokenIn for swap
    setTokenIn({
      chain: token.chain,
      chainName: token.chainName,
      symbol: token.symbol,
      name: token.name,
      balance: token.balance,
      balanceFormatted: token.balanceFormatted,
      usdValue: token.usdValue,
      usdPrice: token.usdPrice,
      contractAddress: token.contractAddress,
      decimals: token.decimals,
      isNative: token.isNative,
      logo: token.logo,
    });

    // Navigate to swap screen
    setMainScreen('swap');

    // Close the dialog
    onClose();
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Token Information"
        onClose={onClose}
        icon={<XIcon className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          {/* Token Header */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="size-16 flex items-center justify-center rounded-full bg-[var(--primary-color)]/10 overflow-hidden">
                {scamAlert.isScam ? (
                  <div className="size-16 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-500/10 text-orange-600">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                ) : (
                  <TokenLogo
                    symbol={token.symbol}
                    existingLogo={token.logo}
                    networkId={token.chain}
                    tokenAddress={token.contractAddress}
                    className="size-16 rounded-full"
                  />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 size-6 bg-[var(--background-color)] rounded-full flex items-center justify-center border border-[var(--card-color)]">
                <img
                  src={getNetworkIcon(token.chain)}
                  alt={token.chainName}
                  className="size-4 rounded-full"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white truncate">
                {token.name}
              </h3>
              <p className="text-white/60 truncate">{token.symbol}</p>
              <p className="text-sm text-white/40 truncate">
                {token.chainName}
              </p>
            </div>
          </div>

          {/* Scam Warning Alert */}
          {scamAlert.isScam && (
            <div
              className={`p-3 rounded-lg border ${
                scamAlert.riskLevel === 'high'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : scamAlert.riskLevel === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-orange-500/10 border-orange-500/30'
              }`}
            >
              {/* Collapsible Header */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsWarningExpanded(!isWarningExpanded)}
              >
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 ${
                    scamAlert.riskLevel === 'high'
                      ? 'text-amber-400'
                      : scamAlert.riskLevel === 'medium'
                        ? 'text-yellow-400'
                        : 'text-orange-400'
                  }`}
                />
                <h4
                  className={`font-semibold text-sm flex-1 ${
                    scamAlert.riskLevel === 'high'
                      ? 'text-amber-400'
                      : scamAlert.riskLevel === 'medium'
                        ? 'text-yellow-400'
                        : 'text-orange-400'
                  }`}
                >
                  Security Warning - {scamAlert.riskLevel.toUpperCase()} Risk
                </h4>
                {isWarningExpanded ? (
                  <ChevronUp className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/60" />
                )}
              </div>

              {/* Collapsible Content */}
              {isWarningExpanded && (
                <div className="mt-3">
                  <p className="text-sm text-white/70">
                    Verify this token carefully before transactions.
                  </p>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">
                Failed to fetch detailed token information
              </p>
              <p className="text-white/60 text-sm">
                Showing basic information from your wallet
              </p>
            </div>
          ) : null}

          {/* Your Holdings */}
          <Menu
            items={[
              {
                icon: DollarSign,
                label: 'Balance',
                description: `${token.balanceFormatted.toFixed(4)} ${token.symbol}`,
              },
              {
                icon: BarChart3,
                label: 'Value',
                description: (() => {
                  // Calculate USD value using latest price from API if available
                  if (detailedInfo?.price_usd) {
                    const latestPrice = parseFloat(detailedInfo.price_usd);
                    const calculatedValue =
                      token.balanceFormatted * latestPrice;
                    return formatCurrency(calculatedValue);
                  }
                  // Fallback to original value
                  return formatCurrency(token.usdValue);
                })(),
              },
            ]}
          />

          {/* Market Information */}
          {detailedInfo && !error && (
            <Menu
              items={[
                {
                  icon: DollarSign,
                  label: 'Price',
                  description: formatTokenNumber(detailedInfo.price_usd),
                },
                {
                  icon: TrendingUp,
                  label: 'Market Cap',
                  description: formatTokenNumber(detailedInfo.market_cap_usd),
                },
                ...(detailedInfo.fdv_usd && detailedInfo.fdv_usd !== '0'
                  ? [
                      {
                        icon: BarChart3,
                        label: 'FDV',
                        description: formatTokenNumber(detailedInfo.fdv_usd),
                      },
                    ]
                  : []),
                {
                  icon: Activity,
                  label: '24h Volume',
                  description: formatTokenNumber(detailedInfo.volume_usd.h24),
                },
                ...(detailedInfo.total_reserve_in_usd &&
                detailedInfo.total_reserve_in_usd !== '0'
                  ? [
                      {
                        icon: Coins,
                        label: 'Liquidity',
                        description: formatTokenNumber(
                          detailedInfo.total_reserve_in_usd
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </div>
      </DialogContent>

      {/* Actions moved to footer */}
      <DialogFooter className="flex-col">
        {/* Swap button - only show for HyperEVM tokens */}
        {isHyperEvmToken && (
          <Button
            variant={scamAlert.isScam ? 'secondary' : 'primary'}
            className={`w-full flex items-center gap-2 ${
              scamAlert.isScam
                ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                : ''
            }`}
            onClick={handleSwapClick}
            disabled={scamAlert.riskLevel === 'high'}
          >
            <ArrowUpDown className="size-4" />
            {scamAlert.riskLevel === 'high'
              ? `⚠️ High Risk - Swap Disabled`
              : scamAlert.isScam
                ? `⚠️ Swap ${token.symbol} (Use Caution)`
                : `Swap ${token.symbol}`}
          </Button>
        )}

        {getTokenExplorerUrl(
          token.chain,
          token.contractAddress,
          token.isNative
        ) && (
          <Button
            variant="secondary"
            className="w-full flex items-center gap-2"
            onClick={() =>
              window.open(
                getTokenExplorerUrl(
                  token.chain,
                  token.contractAddress,
                  token.isNative
                )!,
                '_blank'
              )
            }
          >
            <ExternalLink className="size-4" />
            View on Explorer
          </Button>
        )}
      </DialogFooter>
    </DialogWrapper>
  );
};

export default TokenInfoDialog;
