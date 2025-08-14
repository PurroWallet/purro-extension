import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useHlPortfolioData } from '@/client/hooks/use-hyperliquid-portfolio';
import { useAlchemyTokens } from '@/client/hooks/use-alchemy-tokens';
import { useNativeBalance } from '@/client/hooks/use-native-balance';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';

export interface UnifiedChainBalance {
  chain: 'hyperevm' | 'ethereum' | 'base' | 'arbitrum';
  chainName: string;
  totalValue: number;
  tokenCount: number;
  isLoading: boolean;
  hasError: boolean;
  lastUpdated: number;
}

export interface OptimizedPortfolioData {
  totalBalance: number;
  chainBalances: UnifiedChainBalance[];
  isLoading: boolean;
  hasError: boolean;
  lastUpdated: number;
  refetchAll: () => Promise<void>;
}

// Debounce utility
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Cache for cross-chain data
const portfolioCache = new Map<
  string,
  {
    data: OptimizedPortfolioData;
    timestamp: number;
  }
>();

const CACHE_DURATION = 30 * 1000; // 30 seconds

export const useOptimizedPortfolio = (): OptimizedPortfolioData => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const { isNetworkActive, isHyperliquidDexEnabled } =
    useNetworkSettingsStore();
  const activeAccount = getActiveAccountWalletObject();
  const userAddress = activeAccount?.eip155?.address || '';

  // Debounce address changes to prevent unnecessary API calls
  const debouncedAddress = useDebounce(userAddress, 300);

  // Check which networks are active
  const isHyperliquidEvmActive = isNetworkActive('hyperevm');
  const isEthereumActive = isNetworkActive('ethereum');
  const isBaseActive = isNetworkActive('base');
  const isArbitrumActive = isNetworkActive('arbitrum');
  const hasActiveAlchemyChains =
    isEthereumActive || isBaseActive || isArbitrumActive;

  // Fetch Hyperliquid data based on separate settings
  const {
    totalValue: _hlTotalValue,
    spotValue,
    perpsValue,
    evmValue,
    isLoading: isHlLoading,
    hasError: hasHlError,
    evmData,
  } = useHlPortfolioData({
    fetchSpot: isHyperliquidDexEnabled,
    fetchPerps: isHyperliquidDexEnabled,
    fetchEvm: isHyperliquidEvmActive,
  });

  // Fetch other EVM chains data only if any are active
  const {
    totalUsdValue: _alchemyTotalValue,
    tokensByChain,
    isLoading: isAlchemyLoading,
    hasError: hasAlchemyError,
  } = useAlchemyTokens();

  // Fetch native tokens data
  const {
    totalUsdValue: nativeTotalValue,
    isLoading: isNativeLoading,
    hasError: hasNativeError,
  } = useNativeBalance();

  // Stable timestamp reference
  const timestampRef = useRef<number>(Date.now());

  // Check cache after hooks are called - Fixed cache key
  const cacheKey = `portfolio-${debouncedAddress}-${isHyperliquidDexEnabled}-${isHyperliquidEvmActive}-${hasActiveAlchemyChains}`;
  const cached = portfolioCache.get(cacheKey);

  // Update timestamp only when data actually changes
  const now = useMemo(() => {
    if (!isNativeLoading && !isAlchemyLoading && !isHlLoading) {
      timestampRef.current = Date.now();
    }
    return timestampRef.current;
  }, [isNativeLoading, isAlchemyLoading, isHlLoading]);

  // Calculate Hyperliquid total value correctly based on enabled features
  const hyperliquidTotalValue = useMemo(() => {
    let total = 0;
    if (isHyperliquidDexEnabled) {
      total += (spotValue || 0) + (perpsValue || 0);
    }
    if (isHyperliquidEvmActive) {
      total += evmValue || 0;
    }
    return total;
  }, [
    isHyperliquidDexEnabled,
    isHyperliquidEvmActive,
    spotValue,
    perpsValue,
    evmValue,
  ]);

  // Memoized chain balances calculation
  const chainBalances = useMemo((): UnifiedChainBalance[] => {
    const balances: UnifiedChainBalance[] = [];

    // Hyperliquid balance - only if DEX or EVM is active
    if (isHyperliquidDexEnabled || isHyperliquidEvmActive) {
      balances.push({
        chain: 'hyperevm',
        chainName: 'Hyperliquid',
        totalValue: hyperliquidTotalValue,
        tokenCount:
          (isHyperliquidEvmActive
            ? evmData?.tokensData?.items?.length || 0
            : 0) +
          (isHyperliquidDexEnabled && spotValue > 0 ? 1 : 0) +
          (isHyperliquidDexEnabled && perpsValue > 0 ? 1 : 0),
        isLoading: isHlLoading,
        hasError: hasHlError,
        lastUpdated: now,
      });
    }

    // Other EVM chains - only if active
    if (tokensByChain && hasActiveAlchemyChains) {
      [
        { chain: 'ethereum', isActive: isEthereumActive },
        { chain: 'base', isActive: isBaseActive },
        { chain: 'arbitrum', isActive: isArbitrumActive },
      ].forEach(({ chain, isActive }) => {
        if (isActive) {
          const chainTokens =
            tokensByChain[chain as keyof typeof tokensByChain] || [];
          const chainValue = chainTokens.reduce(
            (sum, token) => sum + (token.usdValue || 0),
            0
          );

          balances.push({
            chain: chain as 'ethereum' | 'base' | 'arbitrum',
            chainName: chain.charAt(0).toUpperCase() + chain.slice(1),
            totalValue: chainValue,
            tokenCount: chainTokens.length,
            isLoading: isAlchemyLoading,
            hasError: hasAlchemyError,
            lastUpdated: now,
          });
        }
      });
    }

    return balances;
  }, [
    isHyperliquidDexEnabled,
    isHyperliquidEvmActive,
    hasActiveAlchemyChains,
    hyperliquidTotalValue,
    tokensByChain,
    evmData?.tokensData?.items?.length,
    isHlLoading,
    hasHlError,
    isAlchemyLoading,
    hasAlchemyError,
    isNativeLoading,
    hasNativeError,
  ]);

  // Calculate total balance
  const totalBalance = useMemo(() => {
    const chainBalanceSum = chainBalances.reduce(
      (sum, chain) => sum + chain.totalValue,
      0
    );
    const nativeBalanceSum = nativeTotalValue || 0;
    return chainBalanceSum + nativeBalanceSum;
  }, [chainBalances, nativeTotalValue]);

  // Overall loading and error states
  const isLoading =
    chainBalances.some(chain => chain.isLoading) || isNativeLoading;
  const hasError =
    chainBalances.some(chain => chain.hasError) || hasNativeError;

  // Stable refetch function
  const refetchAll = useCallback(async () => {
    // Clear cache
    portfolioCache.delete(cacheKey);

    // Update timestamp to force re-render
    timestampRef.current = Date.now();

    // Trigger refetch for all data sources
    // This would need to be implemented based on the specific hooks
    // For now, we'll just clear the cache to force a refresh
  }, [cacheKey]);

  const optimizedData: OptimizedPortfolioData = {
    totalBalance,
    chainBalances,
    isLoading,
    hasError,
    lastUpdated: now,
    refetchAll,
  };

  // Return cached data if available and fresh
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Update cache
  if (!isLoading && !hasError) {
    portfolioCache.set(cacheKey, {
      data: optimizedData,
      timestamp: now,
    });
  }

  return optimizedData;
};

// Hook for getting balance of a specific chain
export const useChainBalance = (chain: UnifiedChainBalance['chain']) => {
  const portfolioData = useOptimizedPortfolio();

  return useMemo(() => {
    return (
      portfolioData.chainBalances.find(balance => balance.chain === chain) || {
        chain,
        chainName: chain.charAt(0).toUpperCase() + chain.slice(1),
        totalValue: 0,
        tokenCount: 0,
        isLoading: false,
        hasError: false,
        lastUpdated: 0,
      }
    );
  }, [portfolioData.chainBalances, chain]);
};
