import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import QueryKeys from '@/client/utils/query-keys';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import { sendMessage } from '../utils/extension-message-utils';
import useWalletStore from './use-wallet-store';
import { ChainType } from '../types/wallet';
import useDevModeStore from './use-dev-mode';

export interface NativeToken {
  chain: ChainType;
  chainName: string;
  symbol: string;
  name: string;
  balance: string; // hex
  balanceFormatted: number; // decimal
  usdPrice?: number;
  usdValue?: number;
  decimals: number;
  isNative: true;
  contractAddress: string; // '0x0000000000000000000000000000000000000000' for native
}

// Native token info
const getNativeTokenInfo = (chain: ChainType) => {
  switch (chain) {
    case 'ethereum':
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        chainName: 'Ethereum',
      };
    case 'base':
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        chainName: 'Base',
      };
    case 'arbitrum':
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        chainName: 'Arbitrum',
      };
    case 'hyperevm':
      return {
        symbol: 'HYPE',
        name: 'Hyperliquid',
        chainName: 'HyperEVM',
      };
    default:
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        chainName: 'Unknown',
      };
  }
};

const getEvmBalance = (address: string, chainId: string) =>
  sendMessage('EVM_GET_BALANCE', { address, chainId });

// Fetch native token prices
const fetchNativeTokenPrices = async (): Promise<Record<string, number>> => {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Using CoinGecko API for ETH and HYPE prices
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,hyperliquid&vs_currencies=usd',
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const ethPrice = data.ethereum?.usd || 0;
    const hypePrice = data.hyperliquid?.usd || 0;

    return {
      ethereum: ethPrice,
      base: ethPrice,
      arbitrum: ethPrice,
      hyperevm: hypePrice,
    };
  } catch {
    return {
      ethereum: 0,
      base: 0,
      arbitrum: 0,
      hyperevm: 0,
    };
  }
};

// Circuit breaker for native balance calls
class NativeBalanceCircuitBreaker {
  private static instance: NativeBalanceCircuitBreaker;
  private failureCounts: Map<string, number> = new Map();
  private lastFailureTime: Map<string, number> = new Map();
  private readonly maxFailures = 3;
  private readonly resetTimeMs = 60000; // 1 minute

  static getInstance(): NativeBalanceCircuitBreaker {
    if (!NativeBalanceCircuitBreaker.instance) {
      NativeBalanceCircuitBreaker.instance = new NativeBalanceCircuitBreaker();
    }
    return NativeBalanceCircuitBreaker.instance;
  }

  isBlocked(chain: string): boolean {
    const failures = this.failureCounts.get(chain) || 0;
    const lastFailure = this.lastFailureTime.get(chain) || 0;

    if (failures >= this.maxFailures) {
      const timeSinceLastFailure = Date.now() - lastFailure;
      if (timeSinceLastFailure < this.resetTimeMs) {
        return true;
      } else {
        // Reset after timeout
        this.failureCounts.set(chain, 0);
        this.lastFailureTime.delete(chain);
      }
    }

    return false;
  }

  recordFailure(chain: string): void {
    const currentFailures = this.failureCounts.get(chain) || 0;
    this.failureCounts.set(chain, currentFailures + 1);
    this.lastFailureTime.set(chain, Date.now());
  }

  recordSuccess(chain: string): void {
    this.failureCounts.set(chain, 0);
    this.lastFailureTime.delete(chain);
  }
}

export const useNativeBalance = () => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const { isNetworkActive } = useNetworkSettingsStore();
  const { isDevMode } = useDevModeStore();
  const activeWallet = getActiveAccountWalletObject();
  const userAddress = activeWallet?.eip155?.address || '';
  const circuitBreaker = NativeBalanceCircuitBreaker.getInstance();

  // Check which networks are active
  const isEthereumActive = isNetworkActive('ethereum');
  const isBaseActive = isNetworkActive('base');
  const isArbitrumActive = isNetworkActive('arbitrum');
  const isHyperliquidActive = isNetworkActive('hyperevm');

  // Build queries only for active networks
  const activeChains = useMemo(
    () => [
      { chain: 'ethereum' as const, isActive: isEthereumActive && !isDevMode },
      { chain: 'base' as const, isActive: isBaseActive && !isDevMode },
      { chain: 'arbitrum' as const, isActive: isArbitrumActive && !isDevMode },
      {
        chain: 'hyperevm' as const,
        isActive: isHyperliquidActive && !isDevMode,
      },
    ],
    [
      isEthereumActive,
      isBaseActive,
      isArbitrumActive,
      isHyperliquidActive,
      isDevMode,
    ]
  );

  const balanceQueries = useMemo(() => {
    const queries: any[] = [];

    activeChains.forEach(({ chain, isActive }) => {
      if (!isActive) return;

      // Map chain to chainId and queryKey
      const getChainConfig = (chainName: string) => {
        switch (chainName) {
          case 'ethereum':
            return {
              chainId: '1',
              queryKey: QueryKeys.ETHEREUM_NATIVE_BALANCE,
            };
          case 'base':
            return { chainId: '8453', queryKey: QueryKeys.BASE_NATIVE_BALANCE };
          case 'arbitrum':
            return {
              chainId: '42161',
              queryKey: QueryKeys.ARBITRUM_NATIVE_BALANCE,
            };
          case 'hyperevm':
            return {
              chainId: '999',
              queryKey: QueryKeys.HYPEREVM_NATIVE_BALANCE,
            };
          default:
            return {
              chainId: '1',
              queryKey: QueryKeys.ETHEREUM_NATIVE_BALANCE,
            };
        }
      };

      const { chainId, queryKey } = getChainConfig(chain);

      queries.push({
        queryKey: [queryKey, userAddress],
        queryFn: async () => {
          if (circuitBreaker.isBlocked(chain)) {
            throw new Error(
              `Circuit breaker: ${chain} native balance calls blocked`
            );
          }

          try {
            const result = await getEvmBalance(userAddress, chainId);
            circuitBreaker.recordSuccess(chain);
            return result;
          } catch (error) {
            circuitBreaker.recordFailure(chain);
            throw error;
          }
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!userAddress,
        retry: 2, // Limit retries to prevent loops
        retryDelay: (attemptIndex: number) =>
          Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
      });
    });

    return queries;
  }, [activeChains, userAddress]);

  // Fetch native token balances
  const balanceResults = useQueries({
    queries: balanceQueries as any,
  });

  // Fetch prices - disabled in dev mode
  const pricesQuery = useQuery({
    queryKey: [QueryKeys.NATIVE_TOKEN_PRICES],
    queryFn: fetchNativeTokenPrices,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !isDevMode, // Always fetch prices when not in dev mode
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Process results
  const processedTokens = useMemo(() => {
    const tokens: NativeToken[] = [];

    // Add safeguard for undefined balanceResults
    if (!balanceResults || !Array.isArray(balanceResults)) {
      return tokens;
    }

    let resultIndex = 0;

    activeChains.forEach(({ chain, isActive }) => {
      if (!isActive) return;

      const result = balanceResults[resultIndex];
      resultIndex++;

      // Check if result has the expected structure: result.data.data.balance
      const messageResponse = result?.data as any;
      const hasValidBalance =
        messageResponse?.success && messageResponse?.data?.balance;

      if (hasValidBalance) {
        const tokenInfo = getNativeTokenInfo(chain);
        const balanceHex = messageResponse.data.balance;

        const balanceWei = BigInt(balanceHex);
        const balanceFormatted = Number(balanceWei) / Math.pow(10, 18);

        // Get price from prices query
        const prices = pricesQuery.data || {};
        const usdPrice = prices[chain] || 0;
        const usdValue = balanceFormatted * usdPrice;

        tokens.push({
          chain,
          chainName: tokenInfo.chainName,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          balance: balanceHex,
          balanceFormatted,
          usdPrice: usdPrice > 0 ? usdPrice : undefined,
          usdValue: usdValue > 0 ? usdValue : undefined,
          decimals: 18,
          isNative: true,
          contractAddress: 'NATIVE',
        });
      }
    });

    // Sort by USD value (highest to lowest), then by chain
    const sortedTokens = tokens.sort((a, b) => {
      if (a.usdValue && b.usdValue) {
        return b.usdValue - a.usdValue;
      }
      if (a.usdValue && !b.usdValue) return -1;
      if (!a.usdValue && b.usdValue) return 1;

      // If no USD values, sort by chain
      return a.chain.localeCompare(b.chain);
    });

    return sortedTokens;
  }, [balanceResults, pricesQuery.data, activeChains]);

  // Calculate totals
  const totalUsdValue = useMemo(() => {
    return processedTokens.reduce((total, token) => {
      return total + (token.usdValue || 0);
    }, 0);
  }, [processedTokens]);

  const totalTokensCount = processedTokens.length;

  // Check loading states
  const isLoading =
    balanceResults.some(result => result.isLoading) || pricesQuery.isLoading;
  const hasError =
    balanceResults.some(result => !!result.error) || !!pricesQuery.error;

  return {
    // Data
    nativeTokens: processedTokens,
    totalTokensCount,
    totalUsdValue,

    // Loading states
    isLoading,

    // Error states
    hasError,
    error:
      balanceResults.find(result => result.error)?.error || pricesQuery.error,

    // Refetch function
    refetch: () => {
      balanceResults.forEach(result => result.refetch());
      pricesQuery.refetch();
    },
  };
};
