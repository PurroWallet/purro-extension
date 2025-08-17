import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  SwapRouteV2Request,
  SwapRouteV2Response,
} from "@/client/types/liquidswap-api";
import { routeFinding } from "@/client/services/liquidswap-api";
import useSwapStore from "./use-swap-store";
import useDebounce from "./use-debounce";

const feeRecipient = "0x490BF4E4425092382612aE7f88D5D98b5029C1aF";
const feeBps = 20;

// Token addresses for wrap/unwrap detection
const WHYPE_TOKEN_ADDRESS = "0x5555555555555555555555555555555555555555";
const HYPE_DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

// Helper functions to detect HYPE/WHYPE tokens
const isHypeToken = (token: any): boolean => {
  if (!token) return false;
  return (
    token.symbol === "HYPE" ||
    token.contractAddress === "native" ||
    token.contractAddress === "NATIVE" ||
    token.contractAddress === HYPE_DEAD_ADDRESS
  );
};

const isWhypeToken = (token: any): boolean => {
  if (!token) return false;
  return (
    token.symbol === "WHYPE" ||
    token.contractAddress?.toLowerCase() === WHYPE_TOKEN_ADDRESS.toLowerCase()
  );
};

// Query key factory for swap routes
export const swapRouteKeys = {
  all: ['swapRoute'] as const,
  route: (params: SwapRouteV2Request) => [...swapRouteKeys.all, 'route', params] as const,
};

// Fetch function for swap route
const fetchSwapRoute = async (params: SwapRouteV2Request): Promise<SwapRouteV2Response> => {
  console.log("🔍 Fetching swap route with params:", params);

  try {
    const result = await routeFinding(params);
    console.log("✅ Route found:", result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching swap route:", error);
    throw error;
  }
};

// Hook for swap route with React Query
export const useSwapRoute = () => {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    isExactIn,
    slippage,
    enableAutoRefresh,
    refreshInterval,
    setRoute,
    setAmountIn,
    setAmountOut,
    setLastRefreshTimestamp,
    getSwapParams,
  } = useSwapStore();

  const queryClient = useQueryClient();

  // Debounce input amounts to avoid too many API calls
  const debouncedAmountIn = useDebounce(amountIn, 500);
  const debouncedAmountOut = useDebounce(amountOut, 500);

  // Create swap parameters for the query
  const swapParams = useMemo(() => {
    const params = getSwapParams();
    if (!params) return null;

    const { tokenInAddress, tokenOutAddress, amount, isExactIn: exactIn, slippage: slippagePercent } = params;

    // Check for direct wrap/unwrap scenarios (currently handled in component)
    // const isDirectWrapUnwrap = (): boolean => {
    //   const isWrap = isHypeToken({ contractAddress: tokenInAddress }) && isWhypeToken({ contractAddress: tokenOutAddress });
    //   const isUnwrap = isWhypeToken({ contractAddress: tokenInAddress }) && isHypeToken({ contractAddress: tokenOutAddress });
    //   return isWrap || isUnwrap;
    // };

    const requestParams: SwapRouteV2Request = {
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      slippage: slippagePercent,
      multiHop: true,
      unwrapWHYPE: true,
      feeRecipient,
      feeBps,
    };

    // Use human-readable amounts for API (not wei)
    if (exactIn) {
      requestParams.amountIn = parseFloat(amount);
    } else {
      requestParams.amountOut = parseFloat(amount);
    }

    return requestParams;
  }, [tokenIn, tokenOut, debouncedAmountIn, debouncedAmountOut, isExactIn, slippage, getSwapParams]);

  // React Query for swap route
  const {
    data: routeData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: swapParams ? swapRouteKeys.route(swapParams) : ['swapRoute', 'disabled'],
    queryFn: () => fetchSwapRoute(swapParams!),
    enabled: !!swapParams && parseFloat((swapParams.amountIn || swapParams.amountOut || '0').toString()) > 0,
    refetchInterval: enableAutoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale to allow refetch
    gcTime: 30000, // Keep in cache for 30 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update store when route data changes
  useEffect(() => {
    if (routeData) {
      setRoute(routeData);
      setLastRefreshTimestamp(Date.now()); // Save timestamp when route is updated

      // Update amounts based on route response
      if (routeData.amountIn && routeData.amountOut) {
        if (isExactIn && routeData.amountOut) {
          // User input amountIn, update amountOut from route
          const formattedAmountOut = parseFloat(routeData.amountOut.toString()).toString();
          if (formattedAmountOut !== amountOut) {
            setAmountOut(formattedAmountOut);
          }
        } else if (!isExactIn && routeData.amountIn) {
          // User input amountOut, update amountIn from route
          const formattedAmountIn = parseFloat(routeData.amountIn.toString()).toString();
          if (formattedAmountIn !== amountIn) {
            setAmountIn(formattedAmountIn);
          }
        }
      }
    } else {
      setRoute(null);
    }
  }, [routeData, isExactIn, setRoute, setAmountIn, setAmountOut, setLastRefreshTimestamp]);

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

  // Helper functions for wrap/unwrap detection
  const isWrapScenario = (): boolean => {
    return tokenIn && tokenOut ?
      isHypeToken(tokenIn) && isWhypeToken(tokenOut) : false;
  };

  const isUnwrapScenario = (): boolean => {
    return tokenIn && tokenOut ?
      isWhypeToken(tokenIn) && isHypeToken(tokenOut) : false;
  };

  const isDirectWrapUnwrap = (): boolean => {
    return isWrapScenario() || isUnwrapScenario();
  };

  return {
    // Route data
    route: routeData || null,
    isLoading,
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
  };
};
