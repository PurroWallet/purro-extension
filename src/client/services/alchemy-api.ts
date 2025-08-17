import { TokenMetadataCacheLib } from '../lib/token-metadata-cache';
import type { TokenMetadata } from '../types/wallet';
import { ENDPOINTS } from './endpoints';

// Chain ID mapping for cache keys
const CHAIN_IDS = {
  ethereum: '1',
  base: '8453',
  arbitrum: '42161',
} as const;

export interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

export interface AlchemyTokenBalanceResponse {
  address: string;
  tokenBalances: AlchemyTokenBalance[];
}

export interface TokenWithMetadata {
  contractAddress: string;
  balance: string;
  metadata: TokenMetadata;
}

export interface ChainTokenData {
  chain: 'ethereum' | 'base' | 'arbitrum';
  tokens: TokenWithMetadata[];
}

// Enhanced circuit breaker for API failures with better 503 handling
class AlchemyCircuitBreaker {
  private static failureCount = 0;
  private static lastFailureTime = 0;
  private static serviceUnavailableCount = 0;
  private static lastServiceUnavailableTime = 0;
  private static readonly FAILURE_THRESHOLD = 8; // Increased from 5 to 8
  private static readonly SERVICE_UNAVAILABLE_THRESHOLD = 3; // Separate threshold for 503s
  private static readonly RESET_TIMEOUT = 120000; // Increased to 2 minutes
  private static readonly SERVICE_UNAVAILABLE_RESET_TIMEOUT = 300000; // 5 minutes for 503s

  static shouldAllowRequest(): boolean {
    const now = Date.now();

    // Check if we're in a failure state
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      if (now - this.lastFailureTime < this.RESET_TIMEOUT) {
        return false;
      }
      // Reset after timeout
      this.failureCount = 0;
    }

    // Check if we're in a service unavailable state
    if (this.serviceUnavailableCount >= this.SERVICE_UNAVAILABLE_THRESHOLD) {
      if (now - this.lastServiceUnavailableTime < this.SERVICE_UNAVAILABLE_RESET_TIMEOUT) {
        return false;
      }
      // Reset after timeout
      this.serviceUnavailableCount = 0;
    }

    return true;
  }

  static recordFailure(isServiceUnavailable: boolean = false): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (isServiceUnavailable) {
      this.serviceUnavailableCount++;
      this.lastServiceUnavailableTime = Date.now();
    }
  }

  static recordSuccess(): void {
    if (this.failureCount > 0 || this.serviceUnavailableCount > 0) {
      this.failureCount = 0;
      this.serviceUnavailableCount = 0;
    }
  }
}

// Fetch token balances from Alchemy (realtime - always fresh)
const fetchAlchemyTokenBalances = async (
  endpoint: string,
  address: string,
  retries: number = 5 // Increased from 3 to 5 for better resilience
): Promise<AlchemyTokenBalanceResponse> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address, 'erc20'],
        }),
      });

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 503) {
          if (attempt < retries) {
            // Progressive backoff with jitter: 2s, 4s, 8s, 12s, 16s + random 0-2s
            const baseDelay = Math.min(Math.pow(2, attempt) * 1000, 16000);
            const jitter =
              crypto.getRandomValues(new Uint32Array(1))[0] /
              (0xffffffff / 2000); // 0-2s random jitter
            const delay = baseDelay + jitter;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (response.status === 429) {
          if (attempt < retries) {
            // Longer delay for rate limiting with jitter
            const baseDelay = Math.pow(2, attempt + 1) * 1000; // 4s, 8s, 16s, 32s, 64s
            const jitter =
              crypto.getRandomValues(new Uint32Array(1))[0] /
              (0xffffffff / 1000); // 0-1s random jitter
            const delay = baseDelay + jitter;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (response.status >= 500) {
          if (attempt < retries) {
            // Server error backoff with jitter
            const baseDelay = Math.pow(2, attempt) * 1000;
            const jitter =
              crypto.getRandomValues(new Uint32Array(1))[0] /
              (0xffffffff / 1000);
            const delay = baseDelay + jitter;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        throw new Error(
          `Failed to fetch token balances: HTTP ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.error) {
        // Check if it's a temporary error
        if (
          data.error.code === -32603 ||
          data.error.message.includes('overloaded') ||
          data.error.message.includes('unavailable')
        ) {
          if (attempt < retries) {
            const delay =
              Math.pow(2, attempt) * 1000 +
              crypto.getRandomValues(new Uint32Array(1))[0] /
              (0xffffffff / 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw new Error(`Alchemy API error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      if (attempt === retries) {
        // Last attempt failed, throw the error
        throw error;
      }

      // Wait before next attempt for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // General error backoff
        const delay =
          Math.pow(2, attempt - 1) * 1000 +
          crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff / 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('All retry attempts failed');
};

// Fast fetch single token metadata - no retries, quick fallback
export const fetchSingleTokenMetadataFast = async (
  endpoint: string,
  contractAddress: string,
  timeout: number = 3000 // 3 second timeout
): Promise<TokenMetadata> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`API error: ${data.error.message}`);
    }

    const result = data.result;
    return {
      name: result?.name || 'Unknown Token',
      symbol: result?.symbol || 'UNKNOWN',
      decimals: result?.decimals || 18,
      logo: result?.logo || undefined,
    };
  } catch {
    // Fast fallback - no retry, no logging spam
    return {
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
    };
  }
};

// Optimized function to get token metadata (cache-first approach)
const getTokensMetadata = async (
  endpoint: string,
  chainId: string,
  contractAddresses: string[]
): Promise<{ [address: string]: TokenMetadata }> => {
  if (contractAddresses.length === 0) return {};

  // Step 1: Get cached metadata
  const cachedMetadata = await TokenMetadataCacheLib.getMultipleCachedMetadata(
    chainId,
    contractAddresses
  );

  // Step 2: Find missing addresses (not in cache)
  const missingAddresses = contractAddresses.filter(
    address => !cachedMetadata[address]
  );

  // Step 3: Fetch missing metadata from API
  const newMetadata: { [address: string]: TokenMetadata } = {};

  if (missingAddresses.length > 0) {
    // Create all fetch promises at once - no batching, no delays
    const fetchPromises = missingAddresses.map(async address => {
      try {
        const metadata = await fetchSingleTokenMetadataFast(endpoint, address);
        return { address, metadata };
      } catch {
        // Use fallback metadata for failed fetches
        return {
          address,
          metadata: {
            name: 'Unknown Token',
            symbol: '???',
            decimals: 18,
            logo: undefined,
          },
        };
      }
    });

    try {
      // Set a global timeout for all fetches
      const results = await Promise.allSettled(fetchPromises);

      // Process results
      let _fallbackCount = 0;

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { address, metadata } = result.value;
          newMetadata[address] = metadata;
          if (metadata.name === 'Unknown Token') {
            _fallbackCount++;
          }
        } else {
          // Handle rejected promises
          _fallbackCount++;
        }
      });

      // Cache the new metadata
      if (Object.keys(newMetadata).length > 0) {
        await TokenMetadataCacheLib.cacheMultipleMetadata(chainId, newMetadata);
      }
    } catch {
      // If batch fails, use fallback for all missing addresses
      for (const address of missingAddresses) {
        newMetadata[address] = {
          name: 'Unknown Token',
          symbol: '???',
          decimals: 18,
          logo: undefined,
        };
      }
    }
  }

  // Step 5: Combine cached and new metadata
  return { ...cachedMetadata, ...newMetadata };
};

// Fetch Ethereum tokens with optimized caching
export const fetchEthereumTokensOptimized = async (
  address: string
): Promise<ChainTokenData> => {
  try {
    // Check circuit breaker
    if (!AlchemyCircuitBreaker.shouldAllowRequest()) {
      return { chain: 'ethereum', tokens: [] };
    }

    // Step 1: Get fresh token balances (always realtime)
    const balances = await fetchAlchemyTokenBalances(
      ENDPOINTS.ALCHEMY_ETH_MAINNET,
      address
    );
    AlchemyCircuitBreaker.recordSuccess();

    // Step 2: Filter non-zero balances
    const nonZeroBalances = balances.tokenBalances.filter(
      token =>
        token.tokenBalance && token.tokenBalance !== '0x0' && !token.error
    );

    if (nonZeroBalances.length === 0) {
      return { chain: 'ethereum', tokens: [] };
    }

    const contractAddresses = nonZeroBalances.map(
      token => token.contractAddress
    );

    // Step 3: Get metadata (cache-first approach)
    const metadataMap = await getTokensMetadata(
      ENDPOINTS.ALCHEMY_ETH_MAINNET,
      CHAIN_IDS.ethereum,
      contractAddresses
    );

    // Step 4: Combine balances with metadata
    const tokensWithMetadata: TokenWithMetadata[] = nonZeroBalances
      .map(token => {
        try {
          const metadata = metadataMap[token.contractAddress.toLowerCase()];

          // Ensure we have valid metadata
          if (!metadata) {
            return {
              contractAddress: token.contractAddress,
              balance: token.tokenBalance,
              metadata: {
                name: 'Unknown Token',
                symbol: 'UNKNOWN',
                decimals: 18,
              },
            };
          }

          return {
            contractAddress: token.contractAddress,
            balance: token.tokenBalance,
            metadata: {
              name: metadata.name || 'Unknown Token',
              symbol: metadata.symbol || 'UNKNOWN',
              decimals:
                typeof metadata.decimals === 'number' ? metadata.decimals : 18,
              logo: metadata.logo,
            },
          };
        } catch {
          return {
            contractAddress: token.contractAddress,
            balance: token.tokenBalance,
            metadata: {
              name: 'Unknown Token',
              symbol: 'UNKNOWN',
              decimals: 18,
            },
          };
        }
      })
      .filter(token => token !== null); // Remove any null entries

    return { chain: 'ethereum', tokens: tokensWithMetadata };
  } catch (error) {
    const isServiceUnavailable =
      error instanceof Error &&
      (error.message.includes('503') ||
        error.message.includes('Service Unavailable') ||
        error.message.includes('overloaded'));
    AlchemyCircuitBreaker.recordFailure(isServiceUnavailable);
    return { chain: 'ethereum', tokens: [] };
  }
};

// Fetch Base tokens with optimized caching
export const fetchBaseTokensOptimized = async (
  address: string
): Promise<ChainTokenData> => {
  try {
    // Check circuit breaker
    if (!AlchemyCircuitBreaker.shouldAllowRequest()) {
      return { chain: 'base', tokens: [] };
    }

    const balances = await fetchAlchemyTokenBalances(
      ENDPOINTS.ALCHEMY_BASE_MAINNET,
      address
    );
    AlchemyCircuitBreaker.recordSuccess();

    const nonZeroBalances = balances.tokenBalances.filter(
      token =>
        token.tokenBalance && token.tokenBalance !== '0x0' && !token.error
    );

    if (nonZeroBalances.length === 0) {
      return { chain: 'base', tokens: [] };
    }

    const contractAddresses = nonZeroBalances.map(
      token => token.contractAddress
    );

    const metadataMap = await getTokensMetadata(
      ENDPOINTS.ALCHEMY_BASE_MAINNET,
      CHAIN_IDS.base,
      contractAddresses
    );

    const tokensWithMetadata: TokenWithMetadata[] = nonZeroBalances
      .map(token => {
        try {
          const metadata = metadataMap[token.contractAddress.toLowerCase()];

          // Ensure we have valid metadata
          if (!metadata) {
            return {
              contractAddress: token.contractAddress,
              balance: token.tokenBalance,
              metadata: {
                name: 'Unknown Token',
                symbol: 'UNKNOWN',
                decimals: 18,
              },
            };
          }

          return {
            contractAddress: token.contractAddress,
            balance: token.tokenBalance,
            metadata: {
              name: metadata.name || 'Unknown Token',
              symbol: metadata.symbol || 'UNKNOWN',
              decimals:
                typeof metadata.decimals === 'number' ? metadata.decimals : 18,
              logo: metadata.logo,
            },
          };
        } catch {
          return {
            contractAddress: token.contractAddress,
            balance: token.tokenBalance,
            metadata: {
              name: 'Unknown Token',
              symbol: 'UNKNOWN',
              decimals: 18,
            },
          };
        }
      })
      .filter(token => token !== null); // Remove any null entries

    return { chain: 'base', tokens: tokensWithMetadata };
  } catch (error) {
    const isServiceUnavailable =
      error instanceof Error &&
      (error.message.includes('503') ||
        error.message.includes('Service Unavailable') ||
        error.message.includes('overloaded'));
    AlchemyCircuitBreaker.recordFailure(isServiceUnavailable);
    return { chain: 'base', tokens: [] };
  }
};

// Fetch Arbitrum tokens with optimized caching
export const fetchArbitrumTokensOptimized = async (
  address: string
): Promise<ChainTokenData> => {
  try {
    // Check circuit breaker
    if (!AlchemyCircuitBreaker.shouldAllowRequest()) {
      return { chain: 'arbitrum', tokens: [] };
    }

    const balances = await fetchAlchemyTokenBalances(
      ENDPOINTS.ALCHEMY_ARB_MAINNET,
      address
    );
    AlchemyCircuitBreaker.recordSuccess();

    const nonZeroBalances = balances.tokenBalances.filter(
      token =>
        token.tokenBalance && token.tokenBalance !== '0x0' && !token.error
    );

    if (nonZeroBalances.length === 0) {
      return { chain: 'arbitrum', tokens: [] };
    }

    const contractAddresses = nonZeroBalances.map(
      token => token.contractAddress
    );

    const metadataMap = await getTokensMetadata(
      ENDPOINTS.ALCHEMY_ARB_MAINNET,
      CHAIN_IDS.arbitrum,
      contractAddresses
    );

    const tokensWithMetadata: TokenWithMetadata[] = nonZeroBalances
      .map(token => {
        try {
          const metadata = metadataMap[token.contractAddress.toLowerCase()];

          // Ensure we have valid metadata
          if (!metadata) {
            return {
              contractAddress: token.contractAddress,
              balance: token.tokenBalance,
              metadata: {
                name: 'Unknown Token',
                symbol: 'UNKNOWN',
                decimals: 18,
              },
            };
          }

          return {
            contractAddress: token.contractAddress,
            balance: token.tokenBalance,
            metadata: {
              name: metadata.name || 'Unknown Token',
              symbol: metadata.symbol || 'UNKNOWN',
              decimals:
                typeof metadata.decimals === 'number' ? metadata.decimals : 18,
              logo: metadata.logo,
            },
          };
        } catch {
          return {
            contractAddress: token.contractAddress,
            balance: token.tokenBalance,
            metadata: {
              name: 'Unknown Token',
              symbol: 'UNKNOWN',
              decimals: 18,
            },
          };
        }
      })
      .filter(token => token !== null); // Remove any null entries

    return { chain: 'arbitrum', tokens: tokensWithMetadata };
  } catch (error) {
    const isServiceUnavailable =
      error instanceof Error &&
      (error.message.includes('503') ||
        error.message.includes('Service Unavailable') ||
        error.message.includes('overloaded'));
    AlchemyCircuitBreaker.recordFailure(isServiceUnavailable);
    return { chain: 'arbitrum', tokens: [] };
  }
};

// Fetch all EVM tokens with optimized caching
export const fetchAllEvmTokensOptimized = async (
  address: string
): Promise<ChainTokenData[]> => {
  try {
    const [ethereumTokens, baseTokens, arbitrumTokens] = await Promise.all([
      fetchEthereumTokensOptimized(address),
      fetchBaseTokensOptimized(address),
      fetchArbitrumTokensOptimized(address),
    ]);

    return [ethereumTokens, baseTokens, arbitrumTokens];
  } catch {
    return [];
  }
};

// Utility function to get cache statistics
export const getTokenCacheStats = async () => {
  return await TokenMetadataCacheLib.getCacheStats();
};

// Utility function to clear cache for a specific chain
export const clearChainTokenCache = async (
  chain: 'ethereum' | 'base' | 'arbitrum'
) => {
  const chainId = CHAIN_IDS[chain];
  await TokenMetadataCacheLib.clearChainCache(chainId);
};

// Utility function to clear all token cache
export const clearAllTokenCache = async () => {
  await TokenMetadataCacheLib.clearAllCache();
};

// Utility function to reset the circuit breaker (for debugging/admin purposes)
export const resetAlchemyCircuitBreaker = () => {
  AlchemyCircuitBreaker.recordSuccess();
};
