import { useEffect, useCallback, useRef } from "react";
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

  const isDirectWrapUnwrap = (): boolean => {
    if (!tokenIn || !tokenOut) return false;
    const isWrap = isHypeToken(tokenIn) && isWhypeToken(tokenOut);
    const isUnwrap = isWhypeToken(tokenIn) && isHypeToken(tokenOut);
    return isWrap || isUnwrap;
  };

  // Debounce input amounts to avoid too many API calls
  const debouncedAmountIn = useDebounce(amountIn, 500);
  const debouncedAmountOut = useDebounce(amountOut, 500);

  // Use ref to prevent duplicate calls
  const isCurrentlyFetching = useRef(false);
  const lastFetchParams = useRef<string | null>(null);

  const fetchRoute = useCallback(
    async (
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
          feeRecipient: feeRecipient,
          feeBps: feeBps,
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
    },
    []
  );

  // Effect to fetch route when inputs change
  useEffect(() => {
    console.log("🔄 useEffect triggered with deps:", {
      tokenIn: tokenIn?.symbol,
      tokenOut: tokenOut?.symbol,
      debouncedAmountIn,
      debouncedAmountOut,
      isExactIn,
      slippage,
      isCurrentlyFetching: isCurrentlyFetching.current,
      tokenInAddress: tokenIn?.contractAddress,
      tokenOutAddress: tokenOut?.contractAddress,
    });

    const getRoute = async () => {
      // Prevent duplicate calls using ref
      if (isCurrentlyFetching.current) {
        console.log("⏸️ Already fetching route, skipping...");
        return;
      }

      // Validate inputs
      if (
        !tokenIn ||
        !tokenOut ||
        tokenIn.contractAddress === tokenOut.contractAddress
      ) {
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

      // Handle direct wrap/unwrap scenarios
      if (isDirectWrapUnwrap()) {
        console.log("🔄 Direct wrap/unwrap detected, skipping route fetch");

        // For direct wrap/unwrap, amountOut = amountIn (1:1 ratio)
        const amount = parseFloat(inputAmount);

        // Create a mock route for direct wrap/unwrap
        const mockRoute: SwapRouteV2Response = {
          success: true,
          tokens: {
            tokenIn: {
              address: tokenIn.contractAddress,
              symbol: tokenIn.symbol,
              name: tokenIn.name,
              decimals: tokenIn.decimals,
            },
            tokenOut: {
              address: tokenOut.contractAddress,
              symbol: tokenOut.symbol,
              name: tokenOut.name,
              decimals: tokenOut.decimals,
            },
          },
          amountIn: amount.toString(),
          amountOut: amount.toString(),
          averagePriceImpact: "0",
          execution: {
            to: isWhypeToken(tokenOut)
              ? WHYPE_TOKEN_ADDRESS
              : HYPE_DEAD_ADDRESS,
            calldata: "0x", // Will be handled by the swap function
            details: {
              path: [tokenIn.contractAddress, tokenOut.contractAddress],
              amountIn: amount.toString(),
              amountOut: amount.toString(),
              minAmountOut: amount.toString(),
              hopSwaps: [
                [
                  {
                    tokenIn: tokenIn.contractAddress,
                    tokenOut: tokenOut.contractAddress,
                    routerIndex: 0,
                    routerName: "Direct Wrap/Unwrap",
                    fee: 0,
                    amountIn: amount.toString(),
                    amountOut: amount.toString(),
                    stable: true,
                    priceImpact: "0",
                  },
                ],
              ],
            },
          },
        };

        setRoute(mockRoute);
        setRouteError(null);
        setIsLoadingRoute(false);

        // Update the opposite amount (1:1 ratio for wrap/unwrap)
        if (isExactIn) {
          setAmountOut(amount.toFixed(6));
        } else {
          setAmountIn(amount.toFixed(6));
        }

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

      const tokenInAddress = tokenIn.contractAddress
        .toLowerCase()
        .includes("native")
        ? WHYPE_TOKEN_ADDRESS
        : tokenIn.contractAddress;
      const tokenOutAddress = tokenOut.contractAddress
        .toLowerCase()
        .includes("native")
        ? WHYPE_TOKEN_ADDRESS
        : tokenOut.contractAddress;

      try {
        console.log(
          "🔍 Fetching route (initial/change triggered) with params:",
          {
            tokenInAddress: tokenIn.contractAddress,
            tokenOutAddress: tokenOut.contractAddress,
            amount: inputAmount,
            isExactIn,
            slippage,
          }
        );
        const route = await fetchRoute(
          tokenInAddress,
          tokenOutAddress,
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
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch route";
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

      // Handle direct wrap/unwrap scenarios in refetch as well
      if (isDirectWrapUnwrap()) {
        console.log(
          "🔄 Direct wrap/unwrap detected in refetch, skipping API call"
        );

        const amountValue = parseFloat(amount);

        // Create the same mock route
        const mockRoute: SwapRouteV2Response = {
          success: true,
          tokens: {
            tokenIn: {
              address: tokenIn.contractAddress,
              symbol: tokenIn.symbol,
              name: tokenIn.name,
              decimals: tokenIn.decimals,
            },
            tokenOut: {
              address: tokenOut.contractAddress,
              symbol: tokenOut.symbol,
              name: tokenOut.name,
              decimals: tokenOut.decimals,
            },
          },
          amountIn: amountValue.toString(),
          amountOut: amountValue.toString(),
          averagePriceImpact: "0",
          execution: {
            to: isWhypeToken(tokenOut)
              ? WHYPE_TOKEN_ADDRESS
              : HYPE_DEAD_ADDRESS,
            calldata: "0x",
            details: {
              path: [tokenIn.contractAddress, tokenOut.contractAddress],
              amountIn: amountValue.toString(),
              amountOut: amountValue.toString(),
              minAmountOut: amountValue.toString(),
              hopSwaps: [
                [
                  {
                    tokenIn: tokenIn.contractAddress,
                    tokenOut: tokenOut.contractAddress,
                    routerIndex: 0,
                    routerName: "Direct Wrap/Unwrap",
                    fee: 0,
                    amountIn: amountValue.toString(),
                    amountOut: amountValue.toString(),
                    stable: true,
                    priceImpact: "0",
                  },
                ],
              ],
            },
          },
        };

        setRoute(mockRoute);
        setRouteError(null);

        // Update the opposite amount (1:1 ratio for wrap/unwrap)
        if (isExactIn) {
          setAmountOut(amountValue.toFixed(6));
        } else {
          setAmountIn(amountValue.toFixed(6));
        }

        return;
      }

      setIsLoadingRoute(true);
      setRouteError(null);
      isCurrentlyFetching.current = true;

      try {
        console.log("🔄 Refetching route (timer triggered)");

        const tokenInAddress = tokenIn.contractAddress
          .toLowerCase()
          .includes("native")
          ? WHYPE_TOKEN_ADDRESS
          : tokenIn.contractAddress;
        const tokenOutAddress = tokenOut.contractAddress
          .toLowerCase()
          .includes("native")
          ? WHYPE_TOKEN_ADDRESS
          : tokenOut.contractAddress;

        const route = await fetchRoute(
          tokenInAddress,
          tokenOutAddress,
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
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch route";
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
