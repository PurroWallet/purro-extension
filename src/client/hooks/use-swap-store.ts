import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UnifiedToken } from "@/client/components/token-list";
import { SwapRouteV2Response } from "@/client/types/liquidswap-api";

/**
 * Swap Store with Persistence
 * 
 * This store manages swap-related state and persists user settings across extension sessions.
 * 
 * Persisted Settings (Simple Approach):
 * - slippage: User's preferred slippage tolerance (0.01% - 50%)
 * - deadline: Transaction deadline in minutes (1 - 4320 minutes)
 * - enableAutoRefresh: Whether to auto-refresh swap routes
 * - refreshInterval: Auto-refresh interval in milliseconds (1000ms - 60000ms)
 * 
 * Non-Persisted State (Resets each session):
 * - tokenIn/tokenOut: Selected tokens (fresh selection each time)
 * - amountIn/amountOut: Current swap amounts 
 * - route: Current swap route data
 * - isSwapping: Transaction state
 * - tokenPrices: Current token prices
 * - lastRefreshTimestamp: Refresh timing
 * 
 * This simple approach ensures that only user preferences are saved while
 * token selections and balances are always fresh when the extension opens.
 */

// Constants for better maintainability
const SWAP_STORAGE_NAME = 'swap-settings-storage';
const SWAP_STORAGE_VERSION = 1;

// Default values
const DEFAULT_SLIPPAGE = 0.5; // 0.5%
const DEFAULT_DEADLINE = 20; // 20 minutes
const DEFAULT_REFRESH_INTERVAL = 10000; // 10 seconds
const DEFAULT_AUTO_REFRESH = true;

// Validation constants
const MIN_SLIPPAGE = 0.01;
const MAX_SLIPPAGE = 50;
const MIN_DEADLINE = 1;
const MAX_DEADLINE = 4320; // 3 days
const MIN_REFRESH_INTERVAL = 1000; // 1 second
const MAX_REFRESH_INTERVAL = 60000; // 1 minute

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

const useSwapStore = create<SwapState>()(
  persist(
    (set, get) => ({
      // Initial state
      tokenIn: null,
      tokenOut: null,
      showTokenSelector: null,
      amountIn: "",
      amountOut: "",
      isExactIn: true,
      slippage: DEFAULT_SLIPPAGE,
      deadline: DEFAULT_DEADLINE,
      route: null,
      isSwapping: false,
      tokenPrices: {},
      enableAutoRefresh: DEFAULT_AUTO_REFRESH,
      refreshInterval: DEFAULT_REFRESH_INTERVAL,
      lastRefreshTimestamp: 0,

      // Actions
      setTokenIn: (token) => set({ tokenIn: token }),
      setTokenOut: (token) => set({ tokenOut: token }),
      setShowTokenSelector: (show) => set({ showTokenSelector: show }),
      setAmountIn: (amount) => set({ amountIn: amount }),
      setAmountOut: (amount) => set({ amountOut: amount }),
      setIsExactIn: (isExactIn) => set({ isExactIn }),
      setSlippage: (slippage) => {
        // Validate slippage value
        const validSlippage = Math.max(MIN_SLIPPAGE, Math.min(MAX_SLIPPAGE, slippage));
        set({ slippage: validSlippage });
      },
      setDeadline: (deadline) => {
        // Validate deadline value
        const validDeadline = Math.max(MIN_DEADLINE, Math.min(MAX_DEADLINE, deadline));
        set({ deadline: validDeadline });
      },
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
      setRefreshInterval: (interval) => {
        // Validate refresh interval
        const validInterval = Math.max(MIN_REFRESH_INTERVAL, Math.min(MAX_REFRESH_INTERVAL, interval));
        set({ refreshInterval: validInterval });
      },
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
    }),
    {
      name: SWAP_STORAGE_NAME,
      version: SWAP_STORAGE_VERSION,
      // Only persist user settings that should survive across sessions
      partialize: (state) => ({
        // Only persist user settings
        slippage: state.slippage,
        deadline: state.deadline,
        enableAutoRefresh: state.enableAutoRefresh,
        refreshInterval: state.refreshInterval,
        // Don't persist anything else - keep it simple
        // tokenIn, tokenOut, amounts, route, etc. will reset on each session
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Swap store rehydrated - settings only:', {
          slippage: state?.slippage,
          deadline: state?.deadline,
          enableAutoRefresh: state?.enableAutoRefresh,
          refreshInterval: state?.refreshInterval,
        });
      },
    }
  )
);

export default useSwapStore;
