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

    // Reset circuit breaker after timeout
    if (now - this.lastFailureTime > this.RESET_TIMEOUT) {
      this.failureCount = 0;
      return true;
    }

    // Reset service unavailable counter after timeout
    if (
      now - this.lastServiceUnavailableTime >
      this.SERVICE_UNAVAILABLE_RESET_TIMEOUT
    ) {
      this.serviceUnavailableCount = 0;
    }

    // Block requests if we've hit the failure threshold
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      const timeRemaining = Math.ceil(
        (this.RESET_TIMEOUT - (now - this.lastFailureTime)) / 1000
      );
      console.warn(
        `🚫 Circuit breaker: API calls blocked due to ${this.failureCount} consecutive failures (${timeRemaining}s remaining)`
      );
      return false;
    }

    // Special handling for service unavailable errors (less aggressive)
    if (this.serviceUnavailableCount >= this.SERVICE_UNAVAILABLE_THRESHOLD) {
      const timeRemaining = Math.ceil(
        (this.SERVICE_UNAVAILABLE_RESET_TIMEOUT -
          (now - this.lastServiceUnavailableTime)) /
          1000
      );
      if (timeRemaining > 0) {
        console.warn(
          `🚫 Circuit breaker: API calls blocked due to service unavailable (${timeRemaining}s remaining)`
        );
        return false;
      }
    }

    return true;
  }

  static recordFailure(isServiceUnavailable: boolean = false): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (isServiceUnavailable) {
      this.serviceUnavailableCount++;
      this.lastServiceUnavailableTime = Date.now();
      console.warn(
        `⚠️ Circuit breaker: Service unavailable ${this.serviceUnavailableCount}/${this.SERVICE_UNAVAILABLE_THRESHOLD}, total failures ${this.failureCount}/${this.FAILURE_THRESHOLD}`
      );
    } else {
      console.warn(
        `⚠️ Circuit breaker: Recorded failure ${this.failureCount}/${this.FAILURE_THRESHOLD}`
      );
    }
  }

  static recordSuccess(): void {
    if (this.failureCount > 0 || this.serviceUnavailableCount > 0) {
      console.log(
        `✅ Circuit breaker: Reset after success (was ${this.failureCount} failures, ${this.serviceUnavailableCount} service unavailable)`
      );
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
      console.log(`🌐 Fetching token balances (attempt ${attempt}/${retries})`);

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
          console.warn(
            `⚠️ Alchemy API overloaded (503) - attempt ${attempt}/${retries}`
          );
          if (attempt < retries) {
            // Progressive backoff with jitter: 2s, 4s, 8s, 12s, 16s + random 0-2s
            const baseDelay = Math.min(Math.pow(2, attempt) * 1000, 16000);
            const jitter =
              crypto.getRandomValues(new Uint32Array(1))[0] /
              (0xffffffff / 2000); // 0-2s random jitter
            const delay = baseDelay + jitter;
            console.log(
              `⏳ API overloaded, waiting ${Math.round(delay)}ms before retry...`
            );
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (response.status === 429) {
          console.warn(`⚠️ Rate limited (429) - attempt ${attempt}/${retries}`);
          if (attempt < retries) {
            // Longer delay for rate limiting with jitter
            const baseDelay = Math.pow(2, attempt + 1) * 1000; // 4s, 8s, 16s, 32s, 64s
            const jitter =
              crypto.getRandomValues(new Uint32Array(1))[0] /
              (0xffffffff / 1000); // 0-1s random jitter
            const delay = baseDelay + jitter;
            console.log(`⏳ Rate limited, waiting ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (response.status >= 500) {
          console.warn(
            `⚠️ Server error (${response.status}) - attempt ${attempt}/${retries}`
          );
          if (attempt < retries) {
            // Server error backoff with jitter
            const baseDelay = Math.pow(2, attempt) * 1000;
            const jitter =
              crypto.getRandomValues(new Uint32Array(1))[0] /
              (0xffffffff / 1000);
            const delay = baseDelay + jitter;
            console.log(
              `⏳ Server error, waiting ${Math.round(delay)}ms before retry...`
            );
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
          console.warn(
            `⚠️ Alchemy API temporary error - attempt ${attempt}/${retries}:`,
            data.error.message
          );
          if (attempt < retries) {
            const delay =
              Math.pow(2, attempt) * 1000 +
              crypto.getRandomValues(new Uint32Array(1))[0] /
                (0xffffffff / 1000);
            console.log(
              `⏳ Temporary error, waiting ${Math.round(delay)}ms before retry...`
            );
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw new Error(`Alchemy API error: ${data.error.message}`);
      }

      console.log(
        `✅ Successfully fetched token balances on attempt ${attempt}`
      );
      return data.result;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);

      if (attempt === retries) {
        // Last attempt failed, throw the error
        throw error;
      }

      // Wait before next attempt for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log(`🌐 Network error, waiting 3s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // General error backoff
        const delay =
          Math.pow(2, attempt - 1) * 1000 +
          crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff / 1000);
        console.log(
          `⏳ General error, waiting ${Math.round(delay)}ms before retry...`
        );
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
  } catch (error) {
    // Fast fallback - no retry, no logging spam
    console.warn(`Failed to fetch token metadata for ${contractAddress}:`, error);
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

  console.log(
    `🔍 Getting metadata for ${contractAddresses.length} tokens on chain ${chainId}`
  );

  // Step 1: Get cached metadata
  const cachedMetadata = await TokenMetadataCacheLib.getMultipleCachedMetadata(
    chainId,
    contractAddresses
  );

  const cacheHits = Object.keys(cachedMetadata).length;
  console.log(`💾 Cache hits: ${cacheHits}/${contractAddresses.length} tokens`);

  // Step 2: Find missing addresses (not in cache)
  const missingAddresses = await TokenMetadataCacheLib.getMissingAddresses(
    chainId,
    contractAddresses
  );

  console.log(`🌐 Need to fetch: ${missingAddresses.length} tokens from API`);

  // Step 3: Fetch missing metadata from API
  const newMetadata: { [address: string]: TokenMetadata } = {};

  if (missingAddresses.length > 0) {
    console.log(
      `🚀 Fast batch fetching ${missingAddresses.length} token metadata...`
    );

    // Create all fetch promises at once - no batching, no delays
    const fetchPromises = missingAddresses.map(async address => {
      const metadata = await fetchSingleTokenMetadataFast(endpoint, address);
      return { address: address.toLowerCase(), metadata };
    });

    // Execute ALL fetches simultaneously with timeout
    const startTime = Date.now();
    try {
      // Set a global timeout for all fetches
      const results = (await Promise.race([
        Promise.all(fetchPromises),
        new Promise(
          (_, reject) =>
            setTimeout(() => reject(new Error('Batch timeout')), 8000) // 8 second max for all
        ),
      ])) as Array<{ address: string; metadata: TokenMetadata }>;

      const endTime = Date.now();
      console.log(`⚡ Batch fetch completed in ${endTime - startTime}ms`);

      // Process results
      for (const result of results) {
        newMetadata[result.address] = result.metadata;
      }

      // Count successful vs fallback
      const successCount = Object.values(newMetadata).filter(
        m => m.symbol !== 'UNKNOWN'
      ).length;
      const fallbackCount = Object.values(newMetadata).filter(
        m => m.symbol === 'UNKNOWN'
      ).length;

      if (fallbackCount > 0) {
        console.warn(
          `⚠️ ${fallbackCount}/${missingAddresses.length} tokens used fallback metadata (API errors/timeouts)`
        );
      }
      console.log(
        `✅ Successfully fetched ${successCount}/${missingAddresses.length} token metadata`
      );
    } catch (error) {
      console.error(
        '❌ Batch fetch failed or timed out, using fallback for all:',
        error
      );
      // If batch fails, use fallback for all missing addresses
      for (const address of missingAddresses) {
        newMetadata[address.toLowerCase()] = {
          name: 'Unknown Token',
          symbol: 'UNKNOWN',
          decimals: 18,
        };
      }
    }

    // Step 4: Cache the new metadata (including fallbacks)
    if (Object.keys(newMetadata).length > 0) {
      await TokenMetadataCacheLib.cacheMultipleMetadata(chainId, newMetadata);
      console.log(
        `💾 Cached ${Object.keys(newMetadata).length} metadata entries`
      );
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
    console.log('🔵 Fetching Ethereum tokens with cache optimization...');

    // Check circuit breaker
    if (!AlchemyCircuitBreaker.shouldAllowRequest()) {
      console.warn('🚫 Ethereum: Circuit breaker active, skipping API calls');
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
      console.log('✅ Ethereum: No tokens found');
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
            console.warn(
              `No metadata found for token ${token.contractAddress}`
            );
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
        } catch (error) {
          console.error(
            `Error processing token ${token.contractAddress}:`,
            error
          );
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

    console.log(`✅ Ethereum: ${tokensWithMetadata.length} tokens processed`);
    return { chain: 'ethereum', tokens: tokensWithMetadata };
  } catch (error) {
    console.error('Error fetching Ethereum tokens:', error);
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
    console.log('🔵 Fetching Base tokens with cache optimization...');

    // Check circuit breaker
    if (!AlchemyCircuitBreaker.shouldAllowRequest()) {
      console.warn('🚫 Base: Circuit breaker active, skipping API calls');
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
      console.log('✅ Base: No tokens found');
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
            console.warn(
              `No metadata found for token ${token.contractAddress}`
            );
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
        } catch (error) {
          console.error(
            `Error processing token ${token.contractAddress}:`,
            error
          );
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

    console.log(`✅ Base: ${tokensWithMetadata.length} tokens processed`);
    return { chain: 'base', tokens: tokensWithMetadata };
  } catch (error) {
    console.error('Error fetching Base tokens:', error);
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
    console.log('🔵 Fetching Arbitrum tokens with cache optimization...');

    // Check circuit breaker
    if (!AlchemyCircuitBreaker.shouldAllowRequest()) {
      console.warn('🚫 Arbitrum: Circuit breaker active, skipping API calls');
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
      console.log('✅ Arbitrum: No tokens found');
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
            console.warn(
              `No metadata found for token ${token.contractAddress}`
            );
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
        } catch (error) {
          console.error(
            `Error processing token ${token.contractAddress}:`,
            error
          );
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

    console.log(`✅ Arbitrum: ${tokensWithMetadata.length} tokens processed`);
    return { chain: 'arbitrum', tokens: tokensWithMetadata };
  } catch (error) {
    console.error('Error fetching Arbitrum tokens:', error);
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
    console.log('🚀 Fetching all EVM tokens with optimized caching...');

    const startTime = Date.now();

    const [ethereumTokens, baseTokens, arbitrumTokens] = await Promise.all([
      fetchEthereumTokensOptimized(address),
      fetchBaseTokensOptimized(address),
      fetchArbitrumTokensOptimized(address),
    ]);

    const endTime = Date.now();
    const totalTokens =
      ethereumTokens.tokens.length +
      baseTokens.tokens.length +
      arbitrumTokens.tokens.length;

    console.log(
      `✅ Fetched ${totalTokens} tokens across all chains in ${endTime - startTime}ms`
    );

    return [ethereumTokens, baseTokens, arbitrumTokens];
  } catch (error) {
    console.error('Error fetching all EVM tokens:', error);
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
  console.log('🔄 Circuit breaker manually reset');
};
