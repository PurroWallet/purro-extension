import { useEffect, useCallback } from 'react';
import { Input } from '@/client/components/ui';
import { ArrowUpDown, ChevronDown, AlertTriangle, Zap } from 'lucide-react';
import useSwapStore from '@/client/hooks/use-swap-store';
import { useSwapRoute } from '@/client/hooks/use-swap-route';
import { SwapTokenSelectorDrawer } from '@/client/components/drawers';
import useDrawerStore from '@/client/hooks/use-drawer-store';
import GlueXLogo from '@/assets/logo/gluex.svg';
import TokenLogo from '@/client/components/token-logo';
import {
  getTokenBalance,
  getMaxSpendableBalance,
  estimateGasCost,
} from '@/client/utils/swap-utils';
import { useNativeBalance } from '@/client/hooks/use-native-balance';
import useMainSwapStore from '@/client/hooks/use-main-swap-store';
import { UnifiedToken } from '@/client/components/token-list';
import { getTokenLogo } from '@/client/utils/icons';

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

// Removed WHYPE_TOKEN_ADDRESS since we no longer fetch prices separately

// Helper function to get token price with proper fallbacks
const getTokenPrice = (
  token: { contractAddress?: string; usdPrice?: number } | null,
  tokenPrices: Record<string, { price: number; priceChange24h: number }>
): number => {
  if (!token) return 0;

  // For native HYPE tokens, use WHYPE price
  if (token.contractAddress === 'native') {
    const whypeAddress = '0x5555555555555555555555555555555555555555';
    const whypePrice = tokenPrices[whypeAddress.toLowerCase()]?.price;
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
    inputAmount,
    outputAmount,
    isExactIn,
    slippage,
    route,
    tokenPrices, // Keep for fallback when route data is not available
    setInputAmount,
    setOutputAmount,
    setIsExactIn,
    setTokenOut,
    switchTokens,
  } = useSwapStore();

  const { openDrawer } = useDrawerStore();
  const { clearSwapError } = useMainSwapStore();

  // Get native token balances
  const { nativeTokens } = useNativeBalance();

  // Initialize swap route hook with React Query
  const {
    isLoading: isLoadingRoute,
    error: routeError,
    isWrapScenario,
    isUnwrapScenario,
  } = useSwapRoute();

  // Auto-set HYPE (native) as default output token if no token is selected
  useEffect(() => {
    const setDefaultNativeHype = async () => {
      if (!tokenOut && !tokenIn) {
        // Find native HYPE token from native balance hook
        const nativeHypeToken = nativeTokens.find(
          token => token.chain === 'hyperevm' && token.symbol === 'HYPE'
        );

        const logo = (await getTokenLogo('HYPE')) || DEFAULT_WHYPE_TOKEN.logo;

        const defaultNativeHype = {
          contractAddress: 'native',
          symbol: 'HYPE',
          name: 'HYPE',
          decimals: 18,
          balance: nativeHypeToken?.balance || '0',
          chain: 'hyperevm' as const,
          chainName: 'HyperEVM',
          logo: logo, // Use same logo as WHYPE
          balanceFormatted: nativeHypeToken?.balanceFormatted || 0,
          usdValue: nativeHypeToken?.usdValue || 0,
          usdPrice: nativeHypeToken?.usdPrice,
          isNative: true,
        };

        setTokenOut(defaultNativeHype);
      }
    };

    setDefaultNativeHype();
  }, [tokenOut, setTokenOut, nativeTokens, tokenIn]);

  // Note: Token prices are now provided by GlueX API response directly
  // No need to fetch prices separately since route response includes USD values

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
  }, [inputAmount, outputAmount, tokenIn, tokenOut, clearSwapError]);

  // Get token balances using utility function (with updated native balance)
  const tokenInBalance = tokenIn
    ? getTokenBalance(getNativeHypeWithBalance(tokenIn))
    : 0;
  const tokenOutBalance = tokenOut
    ? getTokenBalance(getNativeHypeWithBalance(tokenOut))
    : 0;

  // Timer is now handled by header using timestamp approach - much simpler!

  // Token prices are now handled by useHyperEvmTokens hook with React Query

  // No cleanup needed - React Query handles cleanup automatically

  const checkAndHandleAmountChangeWrapUnwrap = useCallback(
    (value: string) => {
      if (!isUnwrapScenario() && !isWrapScenario()) return;

      if (isExactIn) {
        setOutputAmount(value);
      } else {
        setInputAmount(value);
      }
    },
    [
      isUnwrapScenario,
      isWrapScenario,
      isExactIn,
      setInputAmount,
      setOutputAmount,
    ]
  );

  // Handle input changes with decimal validation
  const handleInputAmountChange = (value: string) => {
    // Allow empty input
    if (value === '') {
      setInputAmount('');
      setIsExactIn(true);
      return;
    }

    checkAndHandleAmountChangeWrapUnwrap(value);

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenIn && value.includes('.')) {
      const maxDecimals = Math.min(tokenIn.decimals || 18, 8);
      const [, decimal] = value.split('.');
      if (decimal && decimal.length > maxDecimals) return;
    }

    setInputAmount(value);
    setIsExactIn(true);
  };

  const handleOutputAmountChange = (value: string) => {
    // Allow empty input
    if (value === '') {
      setOutputAmount('');
      setIsExactIn(false);
      return;
    }

    checkAndHandleAmountChangeWrapUnwrap(value);

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenOut && value.includes('.')) {
      const maxDecimals = Math.min(tokenOut.decimals || 18, 8);
      const [, decimal] = value.split('.');
      if (decimal && decimal.length > maxDecimals) return;
    }

    setOutputAmount(value);
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
        setInputAmount(maxAmount);
        setIsExactIn(true);

        checkAndHandleAmountChangeWrapUnwrap(maxAmount);
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
        setInputAmount(formattedHalf);
        setIsExactIn(true);

        checkAndHandleAmountChangeWrapUnwrap(formattedHalf);
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
                  value={inputAmount}
                  onChange={e => handleInputAmountChange(e.target.value)}
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
              {tokenIn && inputAmount && parseFloat(inputAmount) > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    ~ $
                    {route?.inputAmountUSD
                      ? parseFloat(route.inputAmountUSD).toFixed(2)
                      : (
                          (parseFloat(inputAmount) || 0) *
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
                  value={outputAmount}
                  onChange={e => handleOutputAmountChange(e.target.value)}
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
              {tokenOut && outputAmount && parseFloat(outputAmount) > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    ~ $
                    {route?.outputAmountUSD
                      ? parseFloat(route.outputAmountUSD).toFixed(2)
                      : (
                          (parseFloat(outputAmount) || 0) *
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
        <a
          href="https://gluex.xyz"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 opacity-70 w-fit justify-end ms-auto"
        >
          <p className="text-[10px] text-white">Powered by</p>
          <img src={GlueXLogo} alt="GlueX" className="w-12 h-3" />
        </a>

        {/* Route Info - Hide for wrap/unwrap scenarios */}
        {!isWrapScenario() && !isUnwrapScenario() && (
          <>
            {route && !isLoadingRoute && (
              <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Estimated Gas</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-[var(--text-color)] font-medium">
                      {(() => {
                        // Use actual computationUnits from GlueX API
                        const gasUnits = route.computationUnits || 150000;
                        return `${gasUnits.toLocaleString()} units`;
                      })()}
                    </span>
                    <span className="text-xs text-white/50">
                      {(() => {
                        // Calculate gas cost using actual computation units and HYPE price
                        const gasUnits = route.computationUnits || 150000;
                        // HyperEVM gas price is typically very low (0.01-0.1 gwei)
                        // Using 0.05 gwei as a reasonable estimate (50000000 wei)
                        const gasPriceWei = 50000000; // 0.05 gwei
                        const gasCostWei = gasUnits * gasPriceWei;
                        const gasInHype = gasCostWei / 1e18;
                        
                        // Get HYPE price from native tokens
                        const hypeToken = nativeTokens.find(
                          token => token.chain === 'hyperevm' && token.symbol === 'HYPE'
                        );
                        const hypePrice = hypeToken?.usdPrice || 50; // Default to $50 if not found
                        const gasInUsd = gasInHype * hypePrice;
                        
                        return `~${gasInHype.toFixed(6)} HYPE (~$${gasInUsd.toFixed(3)})`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">
                    Slippage Tolerance
                  </span>
                  <span className="text-sm text-[var(--text-color)]">
                    {slippage}%
                  </span>
                </div>

                {route.liquidityModules &&
                  route.liquidityModules.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">
                        Liquidity Sources
                      </span>
                      <div className="flex items-center gap-1">
                        <Zap className="size-3 text-[var(--primary-color-light)]" />
                        <span className="text-xs text-white/60">
                          {route.liquidityModules.length} source
                          {route.liquidityModules.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Partner Fee</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-[var(--text-color)] font-medium">
                      {(() => {
                        if (!route.partnerFee || parseFloat(route.partnerFee) === 0) {
                          return '0%';
                        }
                        const feePercentage = ((parseFloat(route.partnerFee) / parseFloat(route.outputAmount)) * 100).toFixed(2);
                        return `${feePercentage}%`;
                      })()}
                    </span>
                    {route.partnerFee && parseFloat(route.partnerFee) > 0 && (
                      <span className="text-xs text-white/50">
                        {(() => {
                          // Convert fee from wei to token amount
                          const feeTokenDecimals = 18; // WHYPE has 18 decimals
                          const feeAmount = parseFloat(route.partnerFee) / Math.pow(10, feeTokenDecimals);
                          
                          // Get fee token symbol (usually WHYPE for output)
                          const feeTokenSymbol = tokenOut?.symbol || 'WHYPE';
                          
                          // Calculate USD value using token price
                          const tokenPrice = getTokenPrice(tokenOut, tokenPrices);
                          const feeUsd = feeAmount * tokenPrice;
                          
                          return `~${feeAmount.toFixed(6)} ${feeTokenSymbol} (~$${feeUsd.toFixed(3)})`;
                        })()}
                      </span>
                    )}
                  </div>
                </div>

                {route.estimatedNetSurplus &&
                  parseFloat(route.estimatedNetSurplus) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">Net Surplus</span>
                      <span className="text-sm text-[var(--primary-color)] font-medium">
                        {(
                          parseFloat(route.estimatedNetSurplus) /
                          Math.pow(10, tokenOut?.decimals || 18)
                        ).toFixed(6)}{' '}
                        {tokenOut?.symbol}
                      </span>
                    </div>
                  )}
              </div>
            )}
          </>
        )}

        {/* Exchange Rate for Wrap/Unwrap Operations */}
        {(isWrapScenario() || isUnwrapScenario()) && tokenIn && tokenOut && (
          <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Exchange Rate</span>
              <span className="text-sm text-[var(--text-color)] font-medium">
                1 {tokenIn.symbol} = 1 {tokenOut.symbol}
              </span>
            </div>
            <div className="flex items-center justify-center mt-2">
              <span className="text-xs text-white/50">
                {isWrapScenario()
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
      </div>
    </div>
  );
};

export default Swap;
