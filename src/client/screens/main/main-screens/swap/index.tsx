import { useEffect, useCallback } from 'react';
import { Input } from '@/client/components/ui';
import { ArrowUpDown, ChevronDown, AlertTriangle, Zap } from 'lucide-react';
import useSwapStore from '@/client/hooks/use-swap-store';
import { useSwapRoute } from '@/client/hooks/use-swap-route';
import { SwapTokenSelectorDrawer } from '@/client/components/drawers';
import useDrawerStore from '@/client/hooks/use-drawer-store';
import { fetchHyperEvmTokenPrices } from '@/client/services/gecko-terminal-api';

import TokenLogo from '@/client/components/token-logo';
import {
  getTokenBalance,
  isWrapScenario,
  isUnwrapScenario,
  getMaxSpendableBalance,
  hasEnoughBalanceWithGas,
  estimateGasCost,
} from '@/client/utils/swap-utils';
// Create a comprehensive formatBalance function for display
const formatBalance = (balance: number): string => {
  if (balance === 0) return '0';

  // For very small amounts, show more precision
  if (balance < 0.000001) {
    if (balance < 0.000000001) return '<0.000000001';
    return balance.toExponential(2);
  }

  // For small amounts, show 6 decimal places
  if (balance < 1) return balance.toFixed(6);

  // For medium amounts, show 4 decimal places
  if (balance < 1000) return balance.toFixed(4);

  // For large amounts, use K/M notation
  if (balance < 1000000) return (balance / 1000).toFixed(2) + 'K';
  return (balance / 1000000).toFixed(2) + 'M';
};

// Format price change percentage
const formatPriceChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

import useWalletStore from '@/client/hooks/use-wallet-store';
import { useNativeBalance } from '@/client/hooks/use-native-balance';
import useMainSwapStore from '@/client/hooks/use-main-swap-store';

import { fetchBalances } from '@/client/services/liquidswap-api';
import { Balance } from '@/client/types/liquidswap-api';
import { UnifiedToken } from '@/client/components/token-list';

// Default WHYPE token data
const DEFAULT_WHYPE_TOKEN = {
  address: '0x5555555555555555555555555555555555555555',
  name: 'Wrapped HYPE',
  symbol: 'WHYPE',
  decimals: 18,
  isERC20Verified: true,
  totalTransfers: 1280900,
  transfers24h: 61195,
  logo: 'https://coin-images.coingecko.com/coins/images/54469/large/_UP3jBsi_400x400.jpg?1739905920',
};

const WHYPE_TOKEN_ADDRESS = '0x5555555555555555555555555555555555555555';

// Helper function to get token price with proper fallbacks
const getTokenPrice = (
  token: any,
  tokenPrices: Record<string, { price: number; priceChange24h: number }>
): number => {
  if (!token) return 0;

  // For native HYPE tokens, use WHYPE price
  if (token.contractAddress === 'native') {
    const whypePrice = tokenPrices[WHYPE_TOKEN_ADDRESS.toLowerCase()]?.price;
    if (whypePrice) return whypePrice;
  }

  // Try lowercase address first
  const normalizedAddress = token.contractAddress?.toLowerCase();
  if (normalizedAddress && tokenPrices[normalizedAddress]?.price) {
    return tokenPrices[normalizedAddress].price;
  }

  // Try original address
  if (token.contractAddress && tokenPrices[token.contractAddress]?.price) {
    return tokenPrices[token.contractAddress].price;
  }

  // Fallback to token's own usdPrice
  return token.usdPrice || 0;
};

const Swap = () => {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    isExactIn,
    slippage,
    route,
    tokenPrices,
    updateTokenPrice,
    setAmountIn,
    setAmountOut,
    setIsExactIn,
    setTokenOut,
    setTokenIn,
    switchTokens,
  } = useSwapStore();

  const { getActiveAccountWalletObject } = useWalletStore();
  const { openDrawer } = useDrawerStore();
  const { clearSwapError } = useMainSwapStore();
  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Get native token balances
  const { nativeTokens } = useNativeBalance();

  // Initialize swap route hook with React Query
  const { isLoading: isLoadingRoute, error: routeError } = useSwapRoute();

  // Auto-set HYPE (native) as default output token if no token is selected
  useEffect(() => {
    if (!tokenOut) {
      // Find native HYPE token from native balance hook
      const nativeHypeToken = nativeTokens.find(
        token => token.chain === 'hyperevm' && token.symbol === 'HYPE'
      );

      const defaultNativeHype = {
        contractAddress: 'native',
        symbol: 'HYPE',
        name: 'HYPE',
        decimals: 18,
        balance: nativeHypeToken?.balance || '0',
        chain: 'hyperevm' as const,
        chainName: 'HyperEVM',
        logo: DEFAULT_WHYPE_TOKEN.logo, // Use same logo as WHYPE
        balanceFormatted: nativeHypeToken?.balanceFormatted || 0,
        usdValue: nativeHypeToken?.usdValue || 0,
        usdPrice: nativeHypeToken?.usdPrice,
        isNative: true,
      };

      setTokenOut(defaultNativeHype);
    }
  }, [tokenOut, setTokenOut, nativeTokens]);

  // Fetch token prices when tokens are selected
  useEffect(() => {
    const fetchTokenPrices = async () => {
      const addressesToFetch: string[] = [];

      // Add tokenIn address if it exists and not native
      if (tokenIn?.contractAddress && tokenIn.contractAddress !== 'native') {
        addressesToFetch.push(tokenIn.contractAddress);
      }

      // Add tokenOut address if it exists and not native
      if (tokenOut?.contractAddress && tokenOut.contractAddress !== 'native') {
        addressesToFetch.push(tokenOut.contractAddress);
      }

      // Add WHYPE address for native HYPE tokens
      if (
        tokenIn?.contractAddress === 'native' ||
        tokenOut?.contractAddress === 'native'
      ) {
        addressesToFetch.push(WHYPE_TOKEN_ADDRESS);
      }

      if (addressesToFetch.length > 0) {
        try {
          const response = await fetchHyperEvmTokenPrices(addressesToFetch);

          if (response?.data?.attributes?.token_prices) {
            Object.entries(response.data.attributes.token_prices).forEach(
              ([address, priceStr]) => {
                const price = parseFloat(priceStr as string);
                if (!isNaN(price)) {
                  updateTokenPrice(address.toLowerCase(), price, 0); // No price change data from this API
                }
              }
            );
          }
        } catch (error) {
          console.error('❌ Error fetching token prices:', error);
        }
      }
    };

    fetchTokenPrices();
  }, [tokenIn?.contractAddress, tokenOut?.contractAddress, updateTokenPrice]);

  // Function to get updated native HYPE token data
  const getNativeHypeWithBalance = useCallback(
    (baseToken: UnifiedToken) => {
      const nativeHypeToken = nativeTokens.find(
        token => token.chain === 'hyperevm' && token.symbol === 'HYPE'
      );

      if (
        nativeHypeToken &&
        baseToken.isNative &&
        baseToken.symbol === 'HYPE'
      ) {
        return {
          ...baseToken,
          balance: nativeHypeToken.balance,
          balanceFormatted: nativeHypeToken.balanceFormatted,
          usdValue: nativeHypeToken.usdValue || 0,
          usdPrice: nativeHypeToken.usdPrice,
        };
      }
      return baseToken;
    },
    [nativeTokens]
  );

  // Clear error when user changes input
  useEffect(() => {
    clearSwapError();
  }, [amountIn, amountOut, tokenIn, tokenOut, clearSwapError]);

  // Get token balances using utility function (with updated native balance)
  const tokenInBalance = tokenIn
    ? getTokenBalance(getNativeHypeWithBalance(tokenIn))
    : 0;
  const tokenOutBalance = tokenOut
    ? getTokenBalance(getNativeHypeWithBalance(tokenOut))
    : 0;

  const tokenInBalanceCheck = tokenIn
    ? hasEnoughBalanceWithGas(
        getNativeHypeWithBalance(tokenIn),
        amountIn,
        estimateGasCost(tokenIn, 'swap')
      )
    : { hasEnough: true, shortfall: 0, details: '' };

  useEffect(() => {
    const fetchWHYPEBalance = async () => {
      if (!activeAccountAddress) return;
      if (
        tokenOut?.contractAddress !== WHYPE_TOKEN_ADDRESS &&
        tokenIn?.contractAddress !== WHYPE_TOKEN_ADDRESS
      ) {
        return;
      }

      try {
        const balance = await fetchBalances({
          wallet: activeAccountAddress || '',
          limit: 1000,
        });

        // Check if balance response has the expected structure
        if (!balance?.data?.tokens || !Array.isArray(balance.data.tokens)) {
          return;
        }

        const whypeBalance = balance.data.tokens.find(
          (token: Balance) => token.token === WHYPE_TOKEN_ADDRESS
        );

        if (whypeBalance && whypeBalance.balance !== undefined) {
          // Create a temporary token object to use getTokenBalance function
          const tempToken: UnifiedToken = {
            balance: whypeBalance.balance,
            decimals: 18, // WHYPE has 18 decimals
            chain: 'hyperevm' as const,
            chainName: 'HyperEVM',
            symbol: 'WHYPE',
            name: 'Wrapped HYPE',
            logo: 'https://coin-images.coingecko.com/coins/images/54469/large/_UP3jBsi_400x400.jpg?1739905920',
            balanceFormatted: 0,
            usdValue: 0,
            contractAddress: DEFAULT_WHYPE_TOKEN.address,
          };
          const formattedBalance = getTokenBalance(tempToken);

          if (tokenOut?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            setTokenOut({
              ...tokenOut,
              balance: whypeBalance.balance,
              balanceFormatted: formattedBalance,
              usdValue: formattedBalance * (tokenOut?.usdPrice || 0),
            });
          } else if (tokenIn?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            setTokenIn({
              ...tokenIn,
              balance: whypeBalance.balance,
              balanceFormatted: formattedBalance,
              usdValue: formattedBalance * (tokenIn?.usdPrice || 0),
            });
          }
        } else {
          // Set default balance of 0 for WHYPE tokens if not found
          if (tokenOut?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            setTokenOut({
              ...tokenOut,
              balance: '0',
              balanceFormatted: 0,
              usdValue: 0,
            });
          } else if (tokenIn?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            setTokenIn({
              ...tokenIn,
              balance: '0',
              balanceFormatted: 0,
              usdValue: 0,
            });
          }
        }
      } catch (error) {
        console.error('❌ Error fetching WHYPE balance:', error);
      }
    };

    // Only fetch if we have an active account and either token is WHYPE
    if (
      activeAccountAddress &&
      (tokenOut?.contractAddress === WHYPE_TOKEN_ADDRESS ||
        tokenIn?.contractAddress === WHYPE_TOKEN_ADDRESS)
    ) {
      fetchWHYPEBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeAccountAddress,
    tokenOut?.contractAddress,
    tokenIn?.contractAddress,
  ]);

  // Timer is now handled by header using timestamp approach - much simpler!

  // Token prices are now handled by useHyperEvmTokens hook with React Query

  // No cleanup needed - React Query handles cleanup automatically

  // Handle input changes with decimal validation
  const handleAmountInChange = (value: string) => {
    // Allow empty input
    if (value === '') {
      setAmountIn('');
      setIsExactIn(true);
      return;
    }

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenIn && value.includes('.')) {
      const maxDecimals = Math.min(tokenIn.decimals || 18, 8);
      const [, decimal] = value.split('.');
      if (decimal && decimal.length > maxDecimals) return;
    }

    setAmountIn(value);
    setIsExactIn(true);
  };

  const handleAmountOutChange = (value: string) => {
    // Allow empty input
    if (value === '') {
      setAmountOut('');
      setIsExactIn(false);
      return;
    }

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenOut && value.includes('.')) {
      const maxDecimals = Math.min(tokenOut.decimals || 18, 8);
      const [, decimal] = value.split('.');
      if (decimal && decimal.length > maxDecimals) return;
    }

    setAmountOut(value);
    setIsExactIn(false);
  };

  const handleMaxClick = () => {
    if (tokenIn && tokenInBalance > 0) {
      // Use enhanced max balance calculation that considers gas fees for native tokens
      const maxAmount = getMaxSpendableBalance(
        getNativeHypeWithBalance(tokenIn),
        {
          reserveGas: true, // Always reserve gas for native tokens
          gasBuffer: 0.1, // 10% buffer
          customGasEstimate: estimateGasCost(tokenIn, 'swap'), // Use swap gas estimate
        }
      );

      if (parseFloat(maxAmount) > 0) {
        setAmountIn(maxAmount);
        setIsExactIn(true);
      }
    }
  };

  const handleHalfClick = () => {
    if (tokenIn && tokenInBalance > 0) {
      // Use enhanced max balance calculation and take half of it
      const maxAmount = getMaxSpendableBalance(
        getNativeHypeWithBalance(tokenIn),
        {
          reserveGas: true,
          gasBuffer: 0.1,
          customGasEstimate: estimateGasCost(tokenIn, 'swap'),
        }
      );

      const halfAmount = parseFloat(maxAmount) / 2;
      if (halfAmount > 0) {
        const decimals = tokenIn.decimals || 18;
        const maxDecimals = Math.min(decimals, 8);
        const formattedHalf = halfAmount
          .toFixed(maxDecimals)
          .replace(/\.?0+$/, '');
        setAmountIn(formattedHalf);
        setIsExactIn(true);
      }
    }
  };

  // Token selection handlers
  const handleTokenInSelect = () => {
    openDrawer(
      <SwapTokenSelectorDrawer
        mode="input"
        selectedTokenAddress={tokenIn?.contractAddress}
        excludeTokenAddress={tokenOut?.contractAddress}
      />
    );
  };

  const handleTokenOutSelect = () => {
    openDrawer(
      <SwapTokenSelectorDrawer
        mode="output"
        selectedTokenAddress={tokenOut?.contractAddress}
        excludeTokenAddress={tokenIn?.contractAddress}
      />
    );
  };

  // Render token selector button
  const TokenSelectorButton = ({
    token,
    onClick,
    label,
  }: {
    token: UnifiedToken | null;
    onClick: () => void;
    label: string;
  }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1 p-1 bg-[var(--card-color)]/50 rounded-full hover:bg-[var(--primary-color)]/20 transition-all duration-300 w-fit border border-[var(--primary-color)]/20"
    >
      {token ? (
        <>
          <div className="size-8 flex items-center justify-center rounded-full overflow-hidden flex-shrink-0">
            <TokenLogo
              symbol={token.symbol}
              existingLogo={token.logo}
              networkId={token.chain}
              tokenAddress={token.contractAddress}
              className="size-6 rounded-full"
              fallbackText={token.symbol.slice(0, 3)}
            />
          </div>
          <span className="text-[var(--text-color)] font-medium text-nowrap">
            {token.symbol}
          </span>
          <ChevronDown className="size-4 text-[var(--primary-color-light)] flex-shrink-0" />
        </>
      ) : (
        <>
          <div className="size-8 bg-[var(--card-color)]/50 rounded-full flex items-center justify-center border border-[var(--primary-color)]/20">
            <span className="text-[var(--primary-color-light)] text-sm">?</span>
          </div>
          <span className="text-white/60 text-nowrap">{label}</span>
          <ChevronDown className="size-4 text-[var(--primary-color-light)]" />
        </>
      )}
    </button>
  );

  return (
    <div className="max-w-md mx-auto p-2">
      <div className="space-y-4 flex flex-col">
        {/* Swap Interface */}
        <div className="relative flex flex-col gap-1">
          {/* Token In */}
          <div className="space-y-2 border border-[var(--primary-color)]/20 rounded-xl p-4 flex flex-col justify-between bg-[var(--card-color)]/30 relative z-10">
            <div className="flex items-center justify-between">
              <h1 className="text-white/60 font-medium">Sell</h1>
              {tokenIn && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-white/60">
                      {formatBalance(tokenInBalance)} {tokenIn.symbol}
                    </span>
                  </div>
                  <button
                    onClick={handleHalfClick}
                    className="text-xs text-[var(--primary-color-light)] hover:text-[var(--primary-color)] transition-all duration-300"
                  >
                    50%
                  </button>
                  <button
                    onClick={handleMaxClick}
                    className="text-xs text-[var(--primary-color-light)] hover:text-[var(--primary-color)] transition-all duration-300"
                  >
                    Max
                  </button>
                </div>
              )}
            </div>

            <div className="">
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="0"
                  value={amountIn}
                  onChange={e => handleAmountInChange(e.target.value)}
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-[var(--text-color)] placeholder-white/40 p-0 focus:ring-0 focus:outline-none"
                  disabled={isLoadingRoute && !isExactIn}
                />
                <TokenSelectorButton
                  token={tokenIn}
                  onClick={handleTokenInSelect}
                  label="Select token"
                />
              </div>
            </div>
            <div>
              {tokenIn && amountIn && parseFloat(amountIn) > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    ~ $
                    {(
                      (parseFloat(amountIn) || 0) *
                      getTokenPrice(tokenIn, tokenPrices)
                    ).toFixed(2)}
                  </span>
                  {tokenIn.contractAddress &&
                    tokenPrices[tokenIn.contractAddress] &&
                    tokenPrices[tokenIn.contractAddress].priceChange24h !==
                      undefined && (
                      <span
                        className={`text-xs font-medium ${
                          tokenPrices[tokenIn.contractAddress].priceChange24h >=
                          0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatPriceChange(
                          tokenPrices[tokenIn.contractAddress].priceChange24h
                        )}
                      </span>
                    )}
                </div>
              ) : (
                <p className="text-xs text-white/60 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
          {/* Switch Button */}
          <div className="flex justify-center p-1 border border-[var(--primary-color)]/20 bg-[var(--background-color)] w-fit rounded-full z-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-1 w-14 bg-[var(--background-color)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
            <button
              onClick={switchTokens}
              className="p-2 bg-[var(--card-color)]/50 rounded-full hover:bg-[var(--primary-color)]/20 transition-all duration-300 relative z-20 border border-[var(--primary-color)]/20"
              disabled={isLoadingRoute}
            >
              {isLoadingRoute ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary-color-light)]"></div>
              ) : (
                <ArrowUpDown className="size-4 text-[var(--primary-color-light)]" />
              )}
            </button>
          </div>

          <div className="space-y-2 border border-[var(--primary-color)]/20 rounded-xl p-4 flex flex-col justify-between bg-[var(--card-color)]/30">
            <div className="flex items-center justify-between">
              <h1 className="text-white/60 font-medium">Buy</h1>
              {tokenOut && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    {formatBalance(tokenOutBalance)} {tokenOut.symbol}
                  </span>
                </div>
              )}
            </div>

            <div className="">
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="0"
                  value={amountOut}
                  onChange={e => handleAmountOutChange(e.target.value)}
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-[var(--text-color)] placeholder-white/40 p-0 focus:ring-0 focus:outline-none"
                  disabled={isLoadingRoute && !isExactIn}
                />
                <TokenSelectorButton
                  token={tokenOut}
                  onClick={handleTokenOutSelect}
                  label="Select token"
                />
              </div>
            </div>
            <div>
              {tokenOut && amountOut && parseFloat(amountOut) > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    ~ $
                    {(
                      (parseFloat(amountOut) || 0) *
                      getTokenPrice(tokenOut, tokenPrices)
                    ).toFixed(2)}
                  </span>
                  {tokenOut.contractAddress &&
                    tokenPrices[tokenOut.contractAddress] &&
                    tokenPrices[tokenOut.contractAddress].priceChange24h !==
                      undefined && (
                      <span
                        className={`text-xs font-medium ${
                          tokenPrices[tokenOut.contractAddress]
                            .priceChange24h >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatPriceChange(
                          tokenPrices[tokenOut.contractAddress].priceChange24h
                        )}
                      </span>
                    )}
                </div>
              ) : (
                <p className="text-xs text-white/60 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
        </div>

        {/* Route Info - Hide for wrap/unwrap scenarios */}
        {!isWrapScenario(tokenIn, tokenOut) &&
          !isUnwrapScenario(tokenIn, tokenOut) && (
            <>
              {route && !isLoadingRoute && (
                <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Price Impact</span>
                    <span
                      className={`text-sm font-medium ${
                        parseFloat(route.averagePriceImpact) > 5
                          ? 'text-[var(--button-color-destructive)]'
                          : parseFloat(route.averagePriceImpact) > 1
                            ? 'text-[var(--primary-color-light)]'
                            : 'text-[var(--primary-color)]'
                      }`}
                    >
                      {parseFloat(route.averagePriceImpact).toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">
                      Slippage Tolerance
                    </span>
                    <span className="text-sm text-[var(--text-color)]">
                      {slippage}%
                    </span>
                  </div>

                  {route.execution?.details.hopSwaps &&
                    route.execution.details.hopSwaps.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Route</span>
                        <div className="flex items-center gap-1">
                          <Zap className="size-3 text-[var(--primary-color-light)]" />
                          <span className="text-xs text-white/60">
                            {route.execution.details.hopSwaps.length} hop
                            {route.execution.details.hopSwaps.length > 1
                              ? 's'
                              : ''}
                          </span>
                        </div>
                      </div>
                    )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Fee</span>
                    <div className="flex items-center gap-1">0.2%</div>
                  </div>
                </div>
              )}
            </>
          )}

        {/* Exchange Rate for Wrap/Unwrap Operations */}
        {(isWrapScenario(tokenIn, tokenOut) ||
          isUnwrapScenario(tokenIn, tokenOut)) &&
          tokenIn &&
          tokenOut && (
            <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Exchange Rate</span>
                <span className="text-sm text-[var(--text-color)] font-medium">
                  1 {tokenIn.symbol} = 1 {tokenOut.symbol}
                </span>
              </div>
              <div className="flex items-center justify-center mt-2">
                <span className="text-xs text-white/50">
                  {isWrapScenario(tokenIn, tokenOut)
                    ? 'Wrapping HYPE to WHYPE'
                    : 'Unwrapping WHYPE to HYPE'}{' '}
                  • No fees • Instant
                </span>
              </div>
            </div>
          )}

        {routeError && (
          <div className="bg-[var(--button-color-destructive)]/10 border border-[var(--button-color-destructive)]/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--button-color-destructive)]" />
              <span className="text-sm text-[var(--button-color-destructive)]">
                {routeError?.message || 'Route error'}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced balance error with gas fee information */}
        {!tokenInBalanceCheck.hasEnough &&
          amountIn &&
          parseFloat(amountIn) > 0 && (
            <div className="bg-[var(--button-color-destructive)]/10 border border-[var(--button-color-destructive)]/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[var(--button-color-destructive)]" />
                <div className="flex flex-col">
                  <span className="text-sm text-[var(--button-color-destructive)]">
                    Insufficient balance
                  </span>
                  <span className="text-xs text-[var(--button-color-destructive)]/70">
                    {tokenInBalanceCheck.details}
                  </span>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Swap;
