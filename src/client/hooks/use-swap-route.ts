import { useEffect, useCallback } from "react";
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
    const getRoute = async () => {
      // Reset previous state
      setRoute(null);
      setRouteError(null);

      // Validate inputs
      if (!tokenIn || !tokenOut || tokenIn.contractAddress === tokenOut.contractAddress) {
        return;
      }

      const inputAmount = isExactIn ? debouncedAmountIn : debouncedAmountOut;
      if (!inputAmount || parseFloat(inputAmount) <= 0) {
        return;
      }

      setIsLoadingRoute(true);

      try {
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
    fetchRoute,
    setRoute,
    setIsLoadingRoute,
    setRouteError,
    setAmountIn,
    setAmountOut,
  ]);

  return {
    fetchRoute,
  };
};

export default useSwapRoute;
