import React from 'react';
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

interface TokenInfoDialogProps {
  token: UnifiedToken;
  onClose: () => void;
}

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
            <div className="relative">
              <TokenLogo
                symbol={token.symbol}
                existingLogo={token.logo}
                networkId={token.chain}
                tokenAddress={token.contractAddress}
                className="size-16 rounded-full"
              />
              <div className="absolute -bottom-1 -right-1 size-6 bg-[var(--background-color)] rounded-full flex items-center justify-center border border-[var(--card-color)]">
                <img
                  src={getNetworkIcon(token.chain)}
                  alt={token.chainName}
                  className="size-4 rounded-full"
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">{token.name}</h3>
              <p className="text-white/60">{token.symbol}</p>
              <p className="text-sm text-white/40">{token.chainName}</p>
            </div>
          </div>

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
            variant="primary"
            className="w-full flex items-center gap-2"
            onClick={handleSwapClick}
          >
            <ArrowUpDown className="size-4" />
            Swap {token.symbol}
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
