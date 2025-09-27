import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  GluexRequest,
  GluexQuoteResult,
} from '@/client/types/gluex-api';
import { getQuote } from '@/client/services/gluex-api';
import useSwapStore from './use-swap-store';
import useWalletStore from './use-wallet-store';
import useDebounce from './use-debounce';

// Removed feeRecipient and feeBps as they're not used in the simplified GlueX request

// Token addresses for wrap/unwrap detection
const WHYPE_TOKEN_ADDRESS = '0x5555555555555555555555555555555555555555';
const HYPE_DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

// Helper functions to detect HYPE/WHYPE tokens
const isHypeToken = (token: { symbol?: string; contractAddress?: string } | null): boolean => {
  if (!token) return false;
  return (
    token.symbol === 'HYPE' ||
    token.contractAddress === 'native' ||
    token.contractAddress === 'NATIVE' ||
    token.contractAddress === HYPE_DEAD_ADDRESS
  );
};

const isWhypeToken = (token: { symbol?: string; contractAddress?: string } | null): boolean => {
  if (!token) return false;
  return (
    token.symbol === 'WHYPE' ||
    token.contractAddress?.toLowerCase() === WHYPE_TOKEN_ADDRESS.toLowerCase()
  );
};

// Query key factory for swap routes
export const swapRouteKeys = {
  all: ['swapRoute'] as const,
  route: (params: GluexRequest) =>
    [...swapRouteKeys.all, 'route', params] as const,
};

// Fetch function for swap route
const fetchSwapRoute = async (
  params: GluexRequest
): Promise<GluexQuoteResult> => {
  try {
    const result = await getQuote(params);
    return result;
  } catch (error) {
    console.error('❌ Error fetching swap route:', error);
    throw error;
  }
};

// Hook for swap route with React Query
export const useSwapRoute = () => {
  const {
    tokenIn,
    tokenOut,
    inputAmount,
    outputAmount,
    isExactIn,
    enableAutoRefresh,
    refreshInterval,
    setRoute,
    setInputAmount,
    setOutputAmount,
    setLastRefreshTimestamp,
    getSwapParams,
  } = useSwapStore();

  const { getActiveAccountWalletObject } = useWalletStore();

  const queryClient = useQueryClient();

  // Debounce input amounts to avoid too many API calls
  const debouncedInputAmount = useDebounce(inputAmount, 500);
  const debouncedOutputAmount = useDebounce(outputAmount, 500);

  // Create swap parameters for the query
  const swapParams = useMemo(() => {
    const params = getSwapParams();
    const activeWallet = getActiveAccountWalletObject();
    const userAddress = activeWallet?.eip155?.address;
    
    if (!params || !userAddress) return null;

    const {
      tokenInAddress,
      tokenOutAddress,
      isExactIn: exactIn,
    } = params;

    // Use debounced amounts
    const amount = exactIn ? debouncedInputAmount : debouncedOutputAmount;
    if (!amount || parseFloat(amount) <= 0) return null;

    // Convert debounced amount to wei for GlueX API
    const decimals = exactIn ? (tokenIn?.decimals || 18) : (tokenOut?.decimals || 18);
    const amountInWei = (parseFloat(amount) * Math.pow(10, decimals)).toString();

    const requestParams: GluexRequest = {
      chainID: 'hyperevm', // Always use hyperliquid chain
      inputToken: tokenInAddress,
      outputToken: tokenOutAddress,
      userAddress,
      outputReceiver: userAddress,
      uniquePID: '115bc1b52b741606be6ed7960e5c84e2e18f37cae6db00741a8751e248890f28', // Partner ID for analytics
      computeEstimate: true,
    };

    // Set amounts based on direction (GlueX uses wei amounts)
    if (exactIn) {
      requestParams.inputAmount = amountInWei;
    } else {
      requestParams.outputAmount = amountInWei;
    }

    return requestParams;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tokenIn,
    tokenOut,
    debouncedInputAmount,
    debouncedOutputAmount,
    isExactIn,
    getSwapParams,
    getActiveAccountWalletObject,
  ]);

  // Helper functions for wrap/unwrap detection
  const isWrapScenario = (): boolean => {
    return tokenIn && tokenOut
      ? isHypeToken(tokenIn) && isWhypeToken(tokenOut)
      : false;
  };

  const isUnwrapScenario = (): boolean => {
    return tokenIn && tokenOut
      ? isWhypeToken(tokenIn) && isHypeToken(tokenOut)
      : false;
  };

  const isDirectWrapUnwrap = (): boolean => {
    return isWrapScenario() || isUnwrapScenario();
  };

  // React Query for swap route
  const {
    data: routeData,
    isFetching,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: swapParams
      ? swapRouteKeys.route(swapParams)
      : ['swapRoute', 'disabled'],
    queryFn: () => fetchSwapRoute(swapParams!),
    enabled:
      !isDirectWrapUnwrap() &&
      !!swapParams &&
      parseFloat(
        (swapParams.inputAmount || swapParams.outputAmount || '0').toString()
      ) > 0,
    refetchInterval: enableAutoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale to allow refetch
    gcTime: 30000, // Keep in cache for 30 seconds
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update store when route data changes
  useEffect(() => {
    if (routeData) {
      setRoute(routeData);
      setLastRefreshTimestamp(Date.now()); // Save timestamp when route is updated

      // Log any warnings from the quote response
      if (routeData.revert) {
        console.warn('⚠️ GlueX Quote: Transaction would revert on-chain');
      }
      if (routeData.lowBalance) {
        console.warn('⚠️ GlueX Quote: Insufficient user balance');
      }

      // Update amounts based on route response (GlueX format)
      if (routeData.inputAmount && routeData.outputAmount && !routeData.revert) {
        if (isExactIn && routeData.outputAmount) {
          // User input inputAmount, update outputAmount from route
          // Convert from wei to human readable
          const outputDecimals = tokenOut?.decimals || 18;
          const formattedOutputAmount = (
            parseFloat(routeData.outputAmount) / Math.pow(10, outputDecimals)
          ).toString();
          if (formattedOutputAmount !== outputAmount) {
            setOutputAmount(formattedOutputAmount);
          }
        } else if (!isExactIn && routeData.inputAmount) {
          // User input outputAmount, update inputAmount from route
          // Convert from wei to human readable
          const inputDecimals = tokenIn?.decimals || 18;
          const formattedInputAmount = (
            parseFloat(routeData.inputAmount) / Math.pow(10, inputDecimals)
          ).toString();
          if (formattedInputAmount !== inputAmount) {
            setInputAmount(formattedInputAmount);
          }
        }
      }
    } else {
      setRoute(null);
    }

    console.log('GlueX routeData', routeData);
  }, [
    routeData,
    isExactIn,
    setRoute,
    setInputAmount,
    setOutputAmount,
    setLastRefreshTimestamp,
    tokenIn,
    tokenOut,
    inputAmount,
    outputAmount,
  ]);

  // Update timestamp when refetching (even if data is same)
  useEffect(() => {
    if (isRefetching) {
      setLastRefreshTimestamp(Date.now());
    }
  }, [isRefetching, setLastRefreshTimestamp]);

  // Manual refresh function
  const refetchRoute = () => {
    return refetch();
  };

  // Invalidate and refetch when tokens change
  const invalidateRouteCache = () => {
    queryClient.invalidateQueries({
      queryKey: swapRouteKeys.all,
    });
  };

  return {
    // Route data
    route: routeData || null,
    isLoading: isFetching,
    isRefetching,
    error: error as Error | null,

    // Actions
    refetchRoute,
    invalidateRouteCache,

    // Helper functions
    isWrapScenario,
    isUnwrapScenario,
    isDirectWrapUnwrap,
    isHypeToken,
    isWhypeToken,

    // Quote-specific helpers
    wouldRevert: routeData?.revert || false,
    hasLowBalance: routeData?.lowBalance || false,
    estimatedGas: routeData?.computationUnits || 0,
    calldata: routeData?.calldata || '',
  };
};
