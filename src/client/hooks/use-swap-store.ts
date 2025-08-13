import { create } from "zustand";
import { UnifiedToken } from "@/client/components/token-list";
import { SwapRouteV2Response } from "@/client/types/liquiswap-api";

export interface SwapState {
  // Token selection
  tokenIn: UnifiedToken | null;
  tokenOut: UnifiedToken | null;
  
  // Amounts
  amountIn: string;
  amountOut: string;
  
  // Swap direction (true = user input tokenIn amount, false = user input tokenOut amount)
  isExactIn: boolean;
  
  // Settings
  slippage: number; // percentage (0.1 = 0.1%)
  deadline: number; // minutes
  
  // Route data
  route: SwapRouteV2Response | null;
  isLoadingRoute: boolean;
  routeError: string | null;
  
  // Transaction
  isSwapping: boolean;
  

  
  // Actions
  setTokenIn: (token: UnifiedToken | null) => void;
  setTokenOut: (token: UnifiedToken | null) => void;
  setAmountIn: (amount: string) => void;
  setAmountOut: (amount: string) => void;
  setIsExactIn: (isExactIn: boolean) => void;
  setSlippage: (slippage: number) => void;
  setDeadline: (deadline: number) => void;
  setRoute: (route: SwapRouteV2Response | null) => void;
  setIsLoadingRoute: (loading: boolean) => void;
  setRouteError: (error: string | null) => void;
  setIsSwapping: (swapping: boolean) => void;
  
  // Utility actions
  switchTokens: () => void;
  resetAmounts: () => void;
  reset: () => void;
}

const useSwapStore = create<SwapState>((set, get) => ({
  // Initial state
  tokenIn: null,
  tokenOut: null,
  amountIn: "",
  amountOut: "",
  isExactIn: true,
  slippage: 0.5, // 0.5%
  deadline: 20, // 20 minutes
  route: null,
  isLoadingRoute: false,
  routeError: null,
  isSwapping: false,
  
  // Actions
  setTokenIn: (token) => set({ tokenIn: token }),
  setTokenOut: (token) => set({ tokenOut: token }),
  setAmountIn: (amount) => set({ amountIn: amount }),
  setAmountOut: (amount) => set({ amountOut: amount }),
  setIsExactIn: (isExactIn) => set({ isExactIn }),
  setSlippage: (slippage) => set({ slippage }),
  setDeadline: (deadline) => set({ deadline }),
  setRoute: (route) => set({ route }),
  setIsLoadingRoute: (loading) => set({ isLoadingRoute: loading }),
  setRouteError: (error) => set({ routeError: error }),
  setIsSwapping: (swapping) => set({ isSwapping: swapping }),
  
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
    routeError: null 
  }),
  
  reset: () => set({
    tokenIn: null,
    tokenOut: null,
    amountIn: "",
    amountOut: "",
    isExactIn: true,
    route: null,
    isLoadingRoute: false,
    routeError: null,
    isSwapping: false,
  }),
}));

export default useSwapStore;
