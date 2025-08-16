import { create } from "zustand";
import { UnifiedToken } from "@/client/components/token-list";
import { SwapRouteV2Response } from "@/client/types/liquidswap-api";

export interface SwapState {
  // Token selection
  tokenIn: UnifiedToken | null;
  tokenOut: UnifiedToken | null;

  // UI state
  showTokenSelector: 'in' | 'out' | null;

  // Amounts
  amountIn: string;
  amountOut: string;

  // Swap direction (true = user input tokenIn amount, false = user input tokenOut amount)
  isExactIn: boolean;

  // Settings
  slippage: number; // percentage (0.1 = 0.1%)
  deadline: number; // minutes

  // Route data - now managed by React Query
  route: SwapRouteV2Response | null;

  // Transaction state
  isSwapping: boolean;

  // Token prices state
  tokenPrices: {
    [address: string]: {
      price: number;
      priceChange24h: number;
    };
  };

  // Auto-refresh settings
  enableAutoRefresh: boolean;
  refreshInterval: number; // in milliseconds
  lastRefreshTimestamp: number;

  // Actions
  setTokenIn: (token: UnifiedToken | null) => void;
  setTokenOut: (token: UnifiedToken | null) => void;
  setShowTokenSelector: (show: 'in' | 'out' | null) => void;
  setAmountIn: (amount: string) => void;
  setAmountOut: (amount: string) => void;
  setIsExactIn: (isExactIn: boolean) => void;
  setSlippage: (slippage: number) => void;
  setDeadline: (deadline: number) => void;
  setRoute: (route: SwapRouteV2Response | null) => void;
  setIsSwapping: (swapping: boolean) => void;
  setTokenPrices: (prices: { [address: string]: { price: number; priceChange24h: number; } }) => void;
  updateTokenPrice: (address: string, price: number, priceChange24h: number) => void;
  setEnableAutoRefresh: (enable: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  setLastRefreshTimestamp: (timestamp: number) => void;

  // Utility actions
  switchTokens: () => void;
  resetAmounts: () => void;
  reset: () => void;

  // Helper methods
  getSwapParams: () => {
    tokenInAddress: string;
    tokenOutAddress: string;
    amount: string;
    isExactIn: boolean;
    slippage: number;
  } | null;
}

const useSwapStore = create<SwapState>((set, get) => ({
  // Initial state
  tokenIn: null,
  tokenOut: null,
  showTokenSelector: null,
  amountIn: "",
  amountOut: "",
  isExactIn: true,
  slippage: 0.5, // 0.5%
  deadline: 20, // 20 minutes
  route: null,
  isSwapping: false,
  tokenPrices: {},
  enableAutoRefresh: true,
  refreshInterval: 10000, // 10 seconds
  lastRefreshTimestamp: 0,

  // Actions
  setTokenIn: (token) => set({ tokenIn: token }),
  setTokenOut: (token) => set({ tokenOut: token }),
  setShowTokenSelector: (show) => set({ showTokenSelector: show }),
  setAmountIn: (amount) => set({ amountIn: amount }),
  setAmountOut: (amount) => set({ amountOut: amount }),
  setIsExactIn: (isExactIn) => set({ isExactIn }),
  setSlippage: (slippage) => set({ slippage }),
  setDeadline: (deadline) => set({ deadline }),
  setRoute: (route) => set({ route }),
  setIsSwapping: (swapping) => set({ isSwapping: swapping }),
  setTokenPrices: (prices) => set({ tokenPrices: prices }),
  updateTokenPrice: (address, price, priceChange24h) =>
    set((state) => ({
      tokenPrices: {
        ...state.tokenPrices,
        [address]: { price, priceChange24h }
      }
    })),
  setEnableAutoRefresh: (enable) => set({ enableAutoRefresh: enable }),
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
  setLastRefreshTimestamp: (timestamp) => set({ lastRefreshTimestamp: timestamp }),

  // Utility actions
  switchTokens: () => {
    const { tokenIn, tokenOut, amountIn, amountOut, isExactIn } = get();
    set({
      tokenIn: tokenOut,
      tokenOut: tokenIn,
      amountIn: isExactIn ? amountOut : amountIn,
      amountOut: isExactIn ? amountIn : amountOut,
      route: null, // Clear route when switching
    });
  },

  resetAmounts: () => set({
    amountIn: "",
    amountOut: "",
    route: null,
  }),

  reset: () => set({
    tokenIn: null,
    tokenOut: null,
    amountIn: "",
    amountOut: "",
    isExactIn: true,
    route: null,
    isSwapping: false,
    tokenPrices: {},
  }),

  // Helper method to get swap parameters for React Query
  getSwapParams: () => {
    const { tokenIn, tokenOut, amountIn, amountOut, isExactIn, slippage } = get();

    if (!tokenIn || !tokenOut) return null;

    const amount = isExactIn ? amountIn : amountOut;
    if (!amount || parseFloat(amount) <= 0) return null;

    // Map native token addresses to WHYPE for API calls
    const WHYPE_TOKEN_ADDRESS = "0x5555555555555555555555555555555555555555";

    const getApiAddress = (token: any): string => {
      const address = token.contractAddress;
      // If token is native (HYPE), use WHYPE address for API
      if (address === 'native' || address === 'NATIVE' || token.symbol === 'HYPE') {
        return WHYPE_TOKEN_ADDRESS;
      }
      return address;
    };

    return {
      tokenInAddress: getApiAddress(tokenIn),
      tokenOutAddress: getApiAddress(tokenOut),
      amount,
      isExactIn,
      slippage,
    };
  },
}));

export default useSwapStore;
