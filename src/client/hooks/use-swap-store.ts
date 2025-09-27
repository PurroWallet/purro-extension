import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UnifiedToken } from '@/client/components/token-list';
import { GluexQuoteResult } from '@/client/types/gluex-api';

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

// Gas estimation constants
const GAS_BUFFER_PERCENTAGE = 0.1; // 10% buffer for gas estimation
const DEFAULT_GAS_LIMIT = 21000; // Standard ETH transfer
const DEFAULT_GAS_PRICE = 20e9; // 20 Gwei in wei
const NATIVE_TOKEN_GAS_RESERVE = 0.001; // Reserve 0.001 ETH/HYPE for gas fees

// Gas estimation types
interface GasEstimate {
  gasLimit: number;
  gasPrice: number; // in wei
  gasCostEth: number;
  gasCostUsd: number;
}

interface MaxBalanceOptions {
  includeGasFees?: boolean;
  customGasEstimate?: GasEstimate;
  gasBuffer?: number; // percentage (0.1 = 10%)
}

export interface SwapState {
  // Token selection
  tokenIn: UnifiedToken | null;
  tokenOut: UnifiedToken | null;

  // UI state
  showTokenSelector: 'in' | 'out' | null;

  // Amounts (using GlueX API naming convention)
  inputAmount: string;
  outputAmount: string;

  // Swap direction (true = user input inputAmount, false = user input outputAmount)
  isExactIn: boolean;

  // Settings
  slippage: number; // percentage (0.1 = 0.1%)
  deadline: number; // minutes

  // Route data - now managed by React Query
  route: GluexQuoteResult | null;

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
  setInputAmount: (amount: string) => void;
  setOutputAmount: (amount: string) => void;
  setIsExactIn: (isExactIn: boolean) => void;
  setSlippage: (slippage: number) => void;
  setDeadline: (deadline: number) => void;
  setRoute: (route: GluexQuoteResult | null) => void;
  setIsSwapping: (swapping: boolean) => void;
  setTokenPrices: (prices: {
    [address: string]: { price: number; priceChange24h: number };
  }) => void;
  updateTokenPrice: (
    address: string,
    price: number,
    priceChange24h: number
  ) => void;
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

  // Gas estimation and max balance methods
  isNativeToken: (token: UnifiedToken) => boolean;
  estimateGas: (token: UnifiedToken) => Promise<GasEstimate | null>;
  getMaxBalance: (
    token: UnifiedToken,
    options?: MaxBalanceOptions
  ) => Promise<string>;
  getMaxBalanceSync: (
    token: UnifiedToken,
    options?: MaxBalanceOptions
  ) => string;
}

const useSwapStore = create<SwapState>()(
  persist(
    (set, get) => ({
      // Initial state
      tokenIn: null,
      tokenOut: null,
      showTokenSelector: null,
      inputAmount: '',
      outputAmount: '',
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
      setTokenIn: token => set({ tokenIn: token }),
      setTokenOut: token => set({ tokenOut: token }),
      setShowTokenSelector: show => set({ showTokenSelector: show }),
      setInputAmount: amount => set({ inputAmount: amount }),
      setOutputAmount: amount => set({ outputAmount: amount }),
      setIsExactIn: isExactIn => set({ isExactIn }),
      setSlippage: slippage => {
        // Validate slippage value
        const validSlippage = Math.max(
          MIN_SLIPPAGE,
          Math.min(MAX_SLIPPAGE, slippage)
        );
        set({ slippage: validSlippage });
      },
      setDeadline: deadline => {
        // Validate deadline value
        const validDeadline = Math.max(
          MIN_DEADLINE,
          Math.min(MAX_DEADLINE, deadline)
        );
        set({ deadline: validDeadline });
      },
      setRoute: route => set({ route }),
      setIsSwapping: swapping => set({ isSwapping: swapping }),
      setTokenPrices: prices => set({ tokenPrices: prices }),
      updateTokenPrice: (address, price, priceChange24h) =>
        set(state => ({
          tokenPrices: {
            ...state.tokenPrices,
            [address]: { price, priceChange24h },
          },
        })),
      setEnableAutoRefresh: enable => set({ enableAutoRefresh: enable }),
      setRefreshInterval: interval => {
        // Validate refresh interval
        const validInterval = Math.max(
          MIN_REFRESH_INTERVAL,
          Math.min(MAX_REFRESH_INTERVAL, interval)
        );
        set({ refreshInterval: validInterval });
      },
      setLastRefreshTimestamp: timestamp =>
        set({ lastRefreshTimestamp: timestamp }),

      // Utility actions
      switchTokens: () => {
        const { tokenIn, tokenOut, inputAmount, outputAmount, isExactIn } = get();
        set({
          tokenIn: tokenOut,
          tokenOut: tokenIn,
          inputAmount: isExactIn ? outputAmount : inputAmount,
          outputAmount: isExactIn ? inputAmount : outputAmount,
          route: null, // Clear route when switching
        });
      },

      resetAmounts: () =>
        set({
          inputAmount: '',
          outputAmount: '',
          route: null,
        }),

      reset: () =>
        set({
          tokenIn: null,
          tokenOut: null,
          inputAmount: '',
          outputAmount: '',
          isExactIn: true,
          route: null,
          isSwapping: false,
          tokenPrices: {},
        }),

      // Helper method to get swap parameters for React Query
      // Now using consistent inputAmount/outputAmount naming
      getSwapParams: () => {
        const { tokenIn, tokenOut, inputAmount, outputAmount, isExactIn, slippage } =
          get();

        if (!tokenIn || !tokenOut) return null;

        const amount = isExactIn ? inputAmount : outputAmount;
        if (!amount || parseFloat(amount) <= 0) return null;

        // Map native token addresses to WHYPE for API calls
        const WHYPE_TOKEN_ADDRESS =
          '0x5555555555555555555555555555555555555555';

        const getApiAddress = (token: UnifiedToken): string => {
          const address = token.contractAddress;
          // If token is native (HYPE), use WHYPE address for API
          if (
            address === 'native' ||
            address === 'NATIVE' ||
            token.symbol === 'HYPE'
          ) {
            return WHYPE_TOKEN_ADDRESS;
          }
          return address;
        };

        return {
          tokenInAddress: getApiAddress(tokenIn), // Maps to GlueX inputToken
          tokenOutAddress: getApiAddress(tokenOut), // Maps to GlueX outputToken
          amount, // Maps to GlueX inputAmount or outputAmount
          isExactIn,
          slippage,
        };
      },

      // Gas estimation and max balance methods
      isNativeToken: (token: UnifiedToken): boolean => {
        if (!token) return false;
        return (
          token.isNative ||
          token.contractAddress === 'native' ||
          token.contractAddress === 'NATIVE' ||
          token.symbol === 'ETH' ||
          token.symbol === 'HYPE' ||
          token.symbol === 'BNB' ||
          token.symbol === 'MATIC'
        );
      },

      estimateGas: async (token: UnifiedToken): Promise<GasEstimate | null> => {
        try {
          const { isNativeToken } = get();

          if (!isNativeToken(token)) {
            // For ERC-20 tokens, use higher gas limit
            return {
              gasLimit: 65000, // Standard ERC-20 transfer
              gasPrice: DEFAULT_GAS_PRICE,
              gasCostEth: (65000 * DEFAULT_GAS_PRICE) / 1e18,
              gasCostUsd:
                ((65000 * DEFAULT_GAS_PRICE) / 1e18) * (token.usdPrice || 3000),
            };
          } else {
            // For native tokens, use standard gas limit
            return {
              gasLimit: DEFAULT_GAS_LIMIT,
              gasPrice: DEFAULT_GAS_PRICE,
              gasCostEth: (DEFAULT_GAS_LIMIT * DEFAULT_GAS_PRICE) / 1e18,
              gasCostUsd:
                ((DEFAULT_GAS_LIMIT * DEFAULT_GAS_PRICE) / 1e18) *
                (token.usdPrice || 3000),
            };
          }
        } catch (error) {
          console.error('Gas estimation failed:', error);
          return null;
        }
      },

      getMaxBalance: async (
        token: UnifiedToken,
        options: MaxBalanceOptions = {}
      ): Promise<string> => {
        const { isNativeToken, estimateGas } = get();

        if (!token?.balance) return '0';

        const {
          includeGasFees = true,
          customGasEstimate,
          gasBuffer = GAS_BUFFER_PERCENTAGE,
        } = options;

        try {
          // Parse token balance
          let balanceValue: bigint;
          if (
            typeof token.balance === 'string' &&
            token.balance.startsWith('0x')
          ) {
            balanceValue = BigInt(token.balance);
          } else {
            balanceValue = BigInt(token.balance || '0');
          }

          const decimals = token.decimals || 18;
          const balanceEth = Number(balanceValue) / Math.pow(10, decimals);

          // For non-native tokens, return full balance
          if (!isNativeToken(token)) {
            return balanceEth.toString();
          }

          // For native tokens, consider gas fees
          if (!includeGasFees) {
            return balanceEth.toString();
          }

          // Get gas estimate
          const gasEstimate = customGasEstimate || (await estimateGas(token));
          if (!gasEstimate) {
            // Fallback: reserve default amount
            const maxBalance = Math.max(
              0,
              balanceEth - NATIVE_TOKEN_GAS_RESERVE
            );
            return maxBalance.toString();
          }

          // Calculate gas cost with buffer
          const gasBufferMultiplier = 1 + gasBuffer;
          const gasCostWithBuffer =
            gasEstimate.gasCostEth * gasBufferMultiplier;

          // Calculate max spendable amount
          const maxBalance = Math.max(0, balanceEth - gasCostWithBuffer);

          return maxBalance.toString();
        } catch (error) {
          console.error('Max balance calculation failed:', error);
          return '0';
        }
      },

      getMaxBalanceSync: (
        token: UnifiedToken,
        options: MaxBalanceOptions = {}
      ): string => {
        const { isNativeToken } = get();

        if (!token?.balance) return '0';

        const { includeGasFees = true, gasBuffer = GAS_BUFFER_PERCENTAGE } =
          options;

        try {
          // Parse token balance
          let balanceValue: bigint;
          if (
            typeof token.balance === 'string' &&
            token.balance.startsWith('0x')
          ) {
            balanceValue = BigInt(token.balance);
          } else {
            balanceValue = BigInt(token.balance || '0');
          }

          const decimals = token.decimals || 18;
          const balanceEth = Number(balanceValue) / Math.pow(10, decimals);

          // For non-native tokens, return full balance
          if (!isNativeToken(token)) {
            return balanceEth.toString();
          }

          // For native tokens, consider gas fees
          if (!includeGasFees) {
            return balanceEth.toString();
          }

          // Use default gas estimation for sync calculation
          const gasBufferMultiplier = 1 + gasBuffer;
          const reserveAmount = NATIVE_TOKEN_GAS_RESERVE * gasBufferMultiplier;
          const maxBalance = Math.max(0, balanceEth - reserveAmount);

          return maxBalance.toString();
        } catch (error) {
          console.error('Sync max balance calculation failed:', error);
          return '0';
        }
      },
    }),
    {
      name: SWAP_STORAGE_NAME,
      version: SWAP_STORAGE_VERSION,
      // Only persist user settings that should survive across sessions
      partialize: state => ({
        // Only persist user settings
        slippage: state.slippage,
        deadline: state.deadline,
        enableAutoRefresh: state.enableAutoRefresh,
        refreshInterval: state.refreshInterval,
        // Don't persist anything else - keep it simple
        // tokenIn, tokenOut, amounts, route, etc. will reset on each session
      }),
    }
  )
);

export default useSwapStore;
