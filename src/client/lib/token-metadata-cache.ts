import { TokenMetadata, TokenMetadataCache } from '../types/wallet';

// Token metadata cache is PERMANENT - metadata rarely changes
// Only cache size limit to prevent storage bloat
const MAX_CACHE_SIZE_PER_CHAIN = 2000; // Increased limit since cache is permanent
const TOKEN_METADATA_CACHE_KEY = 'purro:token-metadata';

export class TokenMetadataCacheLib {
  /**
   * Get cached token metadata (no expiration check - permanent cache)
   */
  static async getCachedMetadata(
    chainId: string,
    contractAddress: string
  ): Promise<TokenMetadata | null> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};
      const chainCache = cache[chainId];

      if (!chainCache) return null;

      const tokenCache = chainCache[contractAddress.toLowerCase()];

      if (!tokenCache) return null;

      // Return cached metadata (no expiration check - permanent cache)
      return tokenCache.metadata;
    } catch (error) {
      console.error('Failed to get cached token metadata:', error);
      return null;
    }
  }

  /**
   * Cache token metadata permanently
   */
  static async cacheMetadata(
    chainId: string,
    contractAddress: string,
    metadata: TokenMetadata
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};

      // Initialize chain cache if not exists
      if (!cache[chainId]) {
        cache[chainId] = {};
      }

      const chainCache = cache[chainId];

      // Check cache size and clean if necessary
      const cacheSize = Object.keys(chainCache).length;
      if (cacheSize >= MAX_CACHE_SIZE_PER_CHAIN) {
        await this.cleanOldestEntries(chainId, chainCache);
      }

      // Cache the metadata permanently (no expiration)
      const now = Date.now();
      chainCache[contractAddress.toLowerCase()] = {
        metadata,
        cachedAt: now,
        expiresAt: -1, // -1 indicates permanent cache
      };

      await chrome.storage.local.set({ [TOKEN_METADATA_CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to cache token metadata:', error);
    }
  }

  /**
   * Get multiple cached metadata at once (no expiration check)
   */
  static async getMultipleCachedMetadata(
    chainId: string,
    contractAddresses: string[]
  ): Promise<{ [address: string]: TokenMetadata }> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};
      const chainCache = cache[chainId];
      const resultMap: { [address: string]: TokenMetadata } = {};

      if (!chainCache) return resultMap;

      for (const address of contractAddresses) {
        const tokenCache = chainCache[address.toLowerCase()];

        if (tokenCache) {
          // No expiration check - permanent cache
          resultMap[address.toLowerCase()] = tokenCache.metadata;
        }
      }

      return resultMap;
    } catch (error) {
      console.error('Failed to get multiple cached metadata:', error);
      return {};
    }
  }

  /**
   * Cache multiple metadata permanently
   */
  static async cacheMultipleMetadata(
    chainId: string,
    metadataMap: { [contractAddress: string]: TokenMetadata }
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};

      if (!cache[chainId]) {
        cache[chainId] = {};
      }

      const chainCache = cache[chainId];
      const now = Date.now();

      // Add all metadata to permanent cache
      for (const [address, metadata] of Object.entries(metadataMap)) {
        chainCache[address.toLowerCase()] = {
          metadata,
          cachedAt: now,
          expiresAt: -1, // -1 indicates permanent cache
        };
      }

      // Check cache size and clean if necessary
      const cacheSize = Object.keys(chainCache).length;
      if (cacheSize > MAX_CACHE_SIZE_PER_CHAIN) {
        await this.cleanOldestEntries(chainId, chainCache);
      }

      await chrome.storage.local.set({ [TOKEN_METADATA_CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to cache multiple metadata:', error);
    }
  }

  /**
   * Remove cached metadata for a specific token (manual removal only)
   */
  static async removeCachedMetadata(
    chainId: string,
    contractAddress: string
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};

      if (cache[chainId]) {
        delete cache[chainId][contractAddress.toLowerCase()];
        await chrome.storage.local.set({ [TOKEN_METADATA_CACHE_KEY]: cache });
      }
    } catch (error) {
      console.error('Failed to remove cached metadata:', error);
    }
  }

  /**
   * Remove multiple cached metadata (manual removal only)
   */
  static async removeMultipleCachedMetadata(
    chainId: string,
    contractAddresses: string[]
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};

      if (cache[chainId]) {
        for (const address of contractAddresses) {
          delete cache[chainId][address.toLowerCase()];
        }
        await chrome.storage.local.set({ [TOKEN_METADATA_CACHE_KEY]: cache });
      }
    } catch (error) {
      console.error('Failed to remove multiple cached metadata:', error);
    }
  }

  /**
   * Clean oldest entries when cache is full (based on cachedAt, not expiration)
   */
  private static async cleanOldestEntries(
    chainId: string,
    chainCache: TokenMetadataCache[string]
  ): Promise<void> {
    try {
      // Get all entries sorted by cachedAt (oldest first)
      const entries = Object.entries(chainCache).sort(
        ([, a], [, b]) => a.cachedAt - b.cachedAt
      );

      // Remove oldest 25% of entries to make room
      const entriesToRemove = Math.floor(entries.length * 0.25);

      for (let i = 0; i < entriesToRemove; i++) {
        delete chainCache[entries[i][0]];
      }


    } catch (error) {
      console.error('Failed to clean oldest entries:', error);
    }
  }

  /**
   * Update metadata for an existing token (rare case when token metadata actually changes)
   */
  static async updateMetadata(
    chainId: string,
    contractAddress: string,
    newMetadata: TokenMetadata
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};

      if (cache[chainId] && cache[chainId][contractAddress.toLowerCase()]) {
        cache[chainId][contractAddress.toLowerCase()].metadata = newMetadata;
        cache[chainId][contractAddress.toLowerCase()].cachedAt = Date.now();
        await chrome.storage.local.set({ [TOKEN_METADATA_CACHE_KEY]: cache });
      }
    } catch (error) {
      console.error('Failed to update token metadata:', error);
    }
  }

  /**
   * Check if metadata exists for a token (no expiration check)
   */
  static async hasMetadata(
    chainId: string,
    contractAddress: string
  ): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};
      const chainCache = cache[chainId];

      if (!chainCache) return false;

      const tokenCache = chainCache[contractAddress.toLowerCase()];
      return !!tokenCache; // No expiration check - permanent cache
    } catch (error) {
      console.error('Failed to check if metadata exists:', error);
      return false;
    }
  }

  /**
   * Get addresses that don't have cached metadata
   */
  static async getMissingAddresses(
    chainId: string,
    contractAddresses: string[]
  ): Promise<string[]> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};
      const chainCache = cache[chainId];

      if (!chainCache) return contractAddresses;

      const missingAddresses: string[] = [];

      for (const address of contractAddresses) {
        const tokenCache = chainCache[address.toLowerCase()];

        if (!tokenCache) {
          // No expiration check - permanent cache
          missingAddresses.push(address);
        }
      }

      return missingAddresses;
    } catch (error) {
      console.error('Failed to get missing addresses:', error);
      return contractAddresses; // Return all addresses on error
    }
  }

  /**
   * Clear cache for a specific chain
   */
  static async clearChainCache(chainId: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};

      if (cache[chainId]) {
        delete cache[chainId];
        await chrome.storage.local.set({ [TOKEN_METADATA_CACHE_KEY]: cache });
      }
    } catch (error) {
      console.error('Failed to clear chain cache:', error);
    }
  }

  /**
   * Clear all token metadata cache
   */
  static async clearAllCache(): Promise<void> {
    try {
      await chrome.storage.local.set({ [TOKEN_METADATA_CACHE_KEY]: {} });
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalEntries: number;
    entriesByChain: { [chainId: string]: number };
    oldestEntry: number | null;
    newestEntry: number | null;
    cacheHitRate?: number; // Can be calculated by tracking hits/misses
  }> {
    try {
      const result = await chrome.storage.local.get([TOKEN_METADATA_CACHE_KEY]);
      const cache = result[TOKEN_METADATA_CACHE_KEY] || {};

      let totalEntries = 0;
      const entriesByChain: { [chainId: string]: number } = {};
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      for (const [chainId, chainCache] of Object.entries(cache)) {
        if (chainCache && typeof chainCache === 'object') {
          const chainEntries = Object.keys(chainCache).length;
          entriesByChain[chainId] = chainEntries;
          totalEntries += chainEntries;

          // Find oldest and newest entries
          for (const tokenCache of Object.values(chainCache)) {
            if (
              tokenCache &&
              typeof tokenCache === 'object' &&
              'cachedAt' in tokenCache
            ) {
              const cachedAt = (tokenCache as any).cachedAt;
              if (typeof cachedAt === 'number') {
                if (oldestEntry === null || cachedAt < oldestEntry) {
                  oldestEntry = cachedAt;
                }
                if (newestEntry === null || cachedAt > newestEntry) {
                  newestEntry = cachedAt;
                }
              }
            }
          }
        }
      }

      return {
        totalEntries,
        entriesByChain,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        entriesByChain: {},
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }
}
