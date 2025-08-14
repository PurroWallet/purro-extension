import { useEffect, useCallback, useRef } from "react";
import { SwapRouteV2Request, SwapRouteV2Response } from "@/client/types/liquiswap-api";
import { routeFinding } from "@/client/services/liquidswap-api";
import useSwapStore from "./use-swap-store";
import useDebounce from "./use-debounce";

export const useSwapRoute = () => {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    isExactIn,
    slippage,
    setRoute,
    setIsLoadingRoute,
    setRouteError,
    setAmountIn,
    setAmountOut,
  } = useSwapStore();

  // Debounce input amounts to avoid too many API calls
  const debouncedAmountIn = useDebounce(amountIn, 500);
  const debouncedAmountOut = useDebounce(amountOut, 500);
  
  // Use ref to prevent duplicate calls
  const isCurrentlyFetching = useRef(false);
  const lastFetchParams = useRef<string | null>(null);

  const fetchRoute = useCallback(async (
    tokenInAddress: string,
    tokenOutAddress: string,
    amount: string,
    exactIn: boolean,
    slippagePercent: number
  ): Promise<SwapRouteV2Response | null> => {
    try {
      const params: SwapRouteV2Request = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        slippage: slippagePercent,
        multiHop: true,
        unwrapWHYPE: true,
      };

      // Use human-readable amounts for API (not wei)
      if (exactIn) {
        params.amountIn = parseFloat(amount);
      } else {
        params.amountOut = parseFloat(amount);
      }

      console.log("🔍 Fetching swap route with params:", params);

      // Use the routeFinding method from liquidswap-api
      const result = await routeFinding(params);
      
      console.log("✅ Route found:", result);
      return result;
    } catch (error) {
      console.error("❌ Error fetching swap route:", error);
      throw error;
    }
  }, []);

  // Effect to fetch route when inputs change
  useEffect(() => {
    console.log("🔄 useEffect triggered with deps:", {
      tokenIn: tokenIn?.symbol,
      tokenOut: tokenOut?.symbol,
      debouncedAmountIn,
      debouncedAmountOut,
      isExactIn,
      slippage,
      isCurrentlyFetching: isCurrentlyFetching.current
    });

    const getRoute = async () => {
      // Prevent duplicate calls using ref
      if (isCurrentlyFetching.current) {
        console.log("⏸️ Already fetching route, skipping...");
        return;
      }

      // Validate inputs
      if (!tokenIn || !tokenOut || tokenIn.contractAddress === tokenOut.contractAddress) {
        setRoute(null);
        setRouteError(null);
        return;
      }

      const inputAmount = isExactIn ? debouncedAmountIn : debouncedAmountOut;
      if (!inputAmount || parseFloat(inputAmount) <= 0) {
        setRoute(null);
        setRouteError(null);
        return;
      }

      // Create unique key for this fetch attempt
      const fetchKey = `${tokenIn.contractAddress}-${tokenOut.contractAddress}-${inputAmount}-${isExactIn}-${slippage}`;
      
      // Check if we already made this exact same request recently
      if (lastFetchParams.current === fetchKey) {
        console.log("⏸️ Same params as last fetch, skipping...", fetchKey);
        return;
      }

      // Reset previous state and set fetching flag
      setRoute(null);
      setRouteError(null);
      setIsLoadingRoute(true);
      isCurrentlyFetching.current = true;
      lastFetchParams.current = fetchKey;

      try {
        console.log("🔍 Fetching route (initial/change triggered) with params:", {
          tokenInAddress: tokenIn.contractAddress,
          tokenOutAddress: tokenOut.contractAddress,
          amount: inputAmount,
          isExactIn,
          slippage
        });
        const route = await fetchRoute(
          tokenIn.contractAddress,
          tokenOut.contractAddress,
          inputAmount,
          isExactIn,
          slippage
        );

        if (route) {
          setRoute(route);
          
          // Update the opposite amount based on route
          // API returns amounts in human-readable format (as strings)
          if (isExactIn) {
            const outputAmount = parseFloat(route.amountOut);
            setAmountOut(outputAmount.toFixed(6));
          } else {
            const inputAmount = parseFloat(route.amountIn);
            setAmountIn(inputAmount.toFixed(6));
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch route";
        setRouteError(errorMessage);
        console.error("Swap route error:", error);
      } finally {
        setIsLoadingRoute(false);
        isCurrentlyFetching.current = false;
        // Clear the params after a short delay to allow timer refetches
        setTimeout(() => {
          lastFetchParams.current = null;
        }, 1000);
      }
    };

    getRoute();
  }, [
    tokenIn,
    tokenOut,
    debouncedAmountIn,
    debouncedAmountOut,
    isExactIn,
    slippage,
    // fetchRoute removed to prevent re-creation issues
  ]);

  const refetchRoute = useCallback(async () => {
    if (tokenIn && tokenOut && (amountIn || amountOut)) {
      // Avoid double fetching if already loading
      if (isCurrentlyFetching.current) {
        console.log("⏸️ Already fetching route (refetch), skipping...");
        return;
      }
      
      const amount = isExactIn ? amountIn : amountOut;
      if (!amount || parseFloat(amount) <= 0) return;

      setIsLoadingRoute(true);
      setRouteError(null);
      isCurrentlyFetching.current = true;

      try {
        console.log("🔄 Refetching route (timer triggered)");
        
        const route = await fetchRoute(
          tokenIn.contractAddress,
          tokenOut.contractAddress,
          amount,
          isExactIn,
          slippage
        );

        if (route) {
          setRoute(route);
          
          // Update the opposite amount based on route
          if (isExactIn) {
            const outputAmount = parseFloat(route.amountOut);
            setAmountOut(outputAmount.toFixed(6));
          } else {
            const inputAmount = parseFloat(route.amountIn);
            setAmountIn(inputAmount.toFixed(6));
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch route";
        setRouteError(errorMessage);
        console.error("Refetch route error:", error);
      } finally {
        setIsLoadingRoute(false);
        isCurrentlyFetching.current = false;
      }
    }
  }, [tokenIn, tokenOut, amountIn, amountOut, isExactIn, slippage, fetchRoute]);

  return {
    fetchRoute,
    refetchRoute,
  };
};

export default useSwapRoute;
