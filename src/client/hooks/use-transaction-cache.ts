import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type {
  EtherscanTransaction,
  TransactionPage,
  UseInfiniteTransactionsOptions,
  ChainTransactionResult,
  MultiChainTransactionPage,
  CachedTransactionData,
  TransactionCache,
} from '@/client/types/etherscan-api';
import { fetchTransactionsForChain } from '@/client/services/etherscan-api';

// Transaction cache configuration
const TRANSACTION_CACHE_KEY = 'purro:transaction-cache';
const MAX_TRANSACTIONS_PER_CHAIN = 5000; // Limit to prevent storage bloat
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes for fresh data

export class TransactionCacheLib {
  /**
   * Get cached transactions for an address and chain
   */
  static async getCachedTransactions(
    address: string,
    chainId: number
  ): Promise<CachedTransactionData | null> {
    try {
      const result = await chrome.storage.local.get([TRANSACTION_CACHE_KEY]);
      const cache: TransactionCache = result[TRANSACTION_CACHE_KEY] || {};
      
      const addressCache = cache[address.toLowerCase()];
      if (!addressCache) return null;
      
      const chainCache = addressCache[chainId.toString()];
      if (!chainCache) return null;
      
      return chainCache;
    } catch (error) {
      console.error('Failed to get cached transactions:', error);
      return null;
    }
  }

  /**
   * Cache transactions for an address and chain
   */
  static async cacheTransactions(
    address: string,
    chainId: number,
    transactions: EtherscanTransaction[],
    lastBlock: string
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TRANSACTION_CACHE_KEY]);
      const cache: TransactionCache = result[TRANSACTION_CACHE_KEY] || {};
      
      if (!cache[address.toLowerCase()]) {
        cache[address.toLowerCase()] = {};
      }
      
      // Limit transactions to prevent storage bloat
      const limitedTransactions = transactions.slice(-MAX_TRANSACTIONS_PER_CHAIN);
      
      cache[address.toLowerCase()][chainId.toString()] = {
        transactions: limitedTransactions,
        lastBlock,
        lastFetch: Date.now(),
        chainId,
      };
      
      await chrome.storage.local.set({ [TRANSACTION_CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to cache transactions:', error);
    }
  }

  /**
   * Append new transactions to existing cache
   */
  static async appendTransactions(
    address: string,
    chainId: number,
    newTransactions: EtherscanTransaction[],
    newLastBlock: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedTransactions(address, chainId);
      if (!cached) {
        // No existing cache, create new one
        await this.cacheTransactions(address, chainId, newTransactions, newLastBlock);
        return;
      }
      
      // Merge transactions, avoiding duplicates
      const existingHashes = new Set(cached.transactions.map(tx => tx.hash));
      const uniqueNewTransactions = newTransactions.filter(tx => !existingHashes.has(tx.hash));
      
      const allTransactions = [...cached.transactions, ...uniqueNewTransactions];
      
      // Sort by block number and transaction index to maintain order
      allTransactions.sort((a, b) => {
        const blockDiff = parseInt(a.blockNumber) - parseInt(b.blockNumber);
        if (blockDiff !== 0) return blockDiff;
        return parseInt(a.transactionIndex) - parseInt(b.transactionIndex);
      });
      
      await this.cacheTransactions(address, chainId, allTransactions, newLastBlock);
    } catch (error) {
      console.error('Failed to append transactions:', error);
    }
  }

  /**
   * Check if cache is fresh (within expiry time)
   */
  static isCacheFresh(cachedData: CachedTransactionData): boolean {
    return Date.now() - cachedData.lastFetch < CACHE_EXPIRY_TIME;
  }

  /**
   * Clear cache for specific address and chain
   */
  static async clearCache(address: string, chainId?: number): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TRANSACTION_CACHE_KEY]);
      const cache: TransactionCache = result[TRANSACTION_CACHE_KEY] || {};
      
      if (chainId) {
        // Clear specific chain
        if (cache[address.toLowerCase()]) {
          delete cache[address.toLowerCase()][chainId.toString()];
        }
      } else {
        // Clear all chains for address
        delete cache[address.toLowerCase()];
      }
      
      await chrome.storage.local.set({ [TRANSACTION_CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to clear transaction cache:', error);
    }
  }
}

/**
 * Enhanced hook that uses cached transactions and fetches only new ones
 */
export const useCachedTransactions = (
  address: string,
  chainId: number,
  options?: UseInfiniteTransactionsOptions & { enableCache?: boolean }
) => {
  const { enabled = true, sort = 'asc', offset = 1000, enableCache = true } = options || {};
  
  return useQuery({
    queryKey: ['cached-transactions', address, chainId, sort, offset, enableCache],
    queryFn: async (): Promise<TransactionPage> => {
      if (!enableCache) {
        // Fallback to original logic if cache is disabled
        return fetchTransactionsForChain({
          address,
          chainId,
          sort,
          offset,
          startBlock: '0',
          endBlock: 'latest',
        });
      }
      
      // Get cached data
      const cached = await TransactionCacheLib.getCachedTransactions(address, chainId);

      if (cached && TransactionCacheLib.isCacheFresh(cached)) {
        // Return cached data if fresh
        console.log('⚡ CACHE HIT: Loading from cache instantly!', {
          address: address.slice(0, 8) + '...',
          chainId,
          cachedTransactions: cached.transactions.length,
          lastBlock: cached.lastBlock,
          cacheAge: Math.round((Date.now() - cached.lastFetch) / 1000) + 's ago',
        });

        return {
          transactions: cached.transactions,
          nextPageParam: undefined, // No pagination for cached data
          chainId,
        };
      }
      
      // Determine start block for fetching
      const startBlock = cached ? (parseInt(cached.lastBlock) + 1).toString() : '0';

      if (cached) {
        console.log('🔄 SMART FETCH: Only getting NEW transactions!', {
          address: address.slice(0, 8) + '...',
          chainId,
          startingFromBlock: startBlock,
          cachedTransactions: cached.transactions.length,
          lastCachedBlock: cached.lastBlock,
          cacheAge: Math.round((Date.now() - cached.lastFetch) / 1000) + 's ago',
        });
      } else {
        console.log('🆕 FIRST FETCH: Getting all transactions from beginning', {
          address: address.slice(0, 8) + '...',
          chainId,
          startingFromBlock: '0',
        });
      }

      // Fetch new transactions
      const result = await fetchTransactionsForChain({
        address,
        chainId,
        sort,
        offset,
        startBlock,
        endBlock: 'latest',
      });
      
      if (result.transactions.length > 0) {
        // Get the last block number from new transactions
        const lastTransaction = result.transactions[result.transactions.length - 1];
        const newLastBlock = lastTransaction.blockNumber;

        console.log('✅ FOUND NEW TRANSACTIONS:', {
          address: address.slice(0, 8) + '...',
          chainId,
          newTransactions: result.transactions.length,
          fromBlock: startBlock,
          toBlock: newLastBlock,
        });

        if (cached) {
          // Append to existing cache
          await TransactionCacheLib.appendTransactions(
            address,
            chainId,
            result.transactions,
            newLastBlock
          );

          console.log('🔄 CACHE UPDATED: Merged with existing cache', {
            address: address.slice(0, 8) + '...',
            chainId,
            newTransactions: result.transactions.length,
            totalCached: (cached.transactions.length + result.transactions.length),
          });

          // Return combined data
          const updatedCache = await TransactionCacheLib.getCachedTransactions(address, chainId);
          return {
            transactions: updatedCache?.transactions || result.transactions,
            nextPageParam: result.nextPageParam,
            chainId,
          };
        } else {
          // Create new cache
          await TransactionCacheLib.cacheTransactions(
            address,
            chainId,
            result.transactions,
            newLastBlock
          );

          console.log('💾 CACHE CREATED: First time caching complete', {
            address: address.slice(0, 8) + '...',
            chainId,
            transactions: result.transactions.length,
            lastBlock: newLastBlock,
          });

          return result;
        }
      } else if (cached) {
        // No new transactions, return cached data
        console.log('📋 NO NEW TRANSACTIONS: Using existing cache', {
          address: address.slice(0, 8) + '...',
          chainId,
          cachedTransactions: cached.transactions.length,
          lastBlock: cached.lastBlock,
        });

        return {
          transactions: cached.transactions,
          nextPageParam: undefined,
          chainId,
        };
      }
      
      // No cached data and no new transactions
      return result;
    },
    enabled: enabled && !!address && !!chainId,
    staleTime: CACHE_EXPIRY_TIME,
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Multi-chain version with caching
 */
export const useCachedInfiniteTransactions = (
  address: string,
  chainIds: number[],
  options?: UseInfiniteTransactionsOptions & { enableCache?: boolean }
) => {
  const { enabled = true, sort = 'asc', offset = 1000, enableCache = true } = options || {};
  
  return useInfiniteQuery<MultiChainTransactionPage, Error, MultiChainTransactionPage[], unknown[], Record<number, string> | undefined>({
    queryKey: ['cached-infinite-transactions', address, chainIds, sort, offset, enableCache],
    queryFn: async ({ pageParam }) => {
      const results: ChainTransactionResult[] = [];
      const nextLastBlocks: Record<number, string> = {};
      
      // Process each chain
      console.log('🔍 MULTI-CHAIN DEBUG: Processing chains', {
        address: address.slice(0, 8) + '...',
        chainIds,
        totalChains: chainIds.length,
      });

      for (const chainId of chainIds) {
        try {
          let startBlock = '0';

          if (enableCache) {
            // Get cached data
            const cached = await TransactionCacheLib.getCachedTransactions(address, chainId);

            if (cached && TransactionCacheLib.isCacheFresh(cached)) {
              // Use cached data if fresh
              console.log(`⚡ MULTI-CHAIN CACHE HIT [Chain ${chainId}]:`, {
                address: address.slice(0, 8) + '...',
                chainId,
                cachedTransactions: cached.transactions.length,
                cacheAge: Math.round((Date.now() - cached.lastFetch) / 1000) + 's ago',
                currentTime: Date.now(),
                lastFetch: cached.lastFetch,
                isFresh: TransactionCacheLib.isCacheFresh(cached),
              });

              results.push({
                chainId,
                transactions: cached.transactions,
                nextPageParam: undefined,
                hasMore: false,
              });
              continue;
            } else if (cached) {
              console.log(`🔄 MULTI-CHAIN CACHE STALE [Chain ${chainId}]:`, {
                address: address.slice(0, 8) + '...',
                chainId,
                cachedTransactions: cached.transactions.length,
                cacheAge: Math.round((Date.now() - cached.lastFetch) / 1000) + 's ago',
                currentTime: Date.now(),
                lastFetch: cached.lastFetch,
                isFresh: TransactionCacheLib.isCacheFresh(cached),
              });
            } else {
              console.log(`🆕 MULTI-CHAIN NO CACHE [Chain ${chainId}]:`, {
                address: address.slice(0, 8) + '...',
                chainId,
              });
            }

            // Use last cached block as start point
            if (cached) {
              startBlock = (parseInt(cached.lastBlock) + 1).toString();
            }
          }
          
          // Use pageParam if provided (for pagination)
          if (pageParam && pageParam[chainId]) {
            startBlock = pageParam[chainId];
          }
          
          // Fetch new transactions
          const result = await fetchTransactionsForChain({
            address,
            chainId,
            sort,
            offset,
            startBlock,
            endBlock: 'latest',
          });
          
          if (enableCache) {
            const cached = await TransactionCacheLib.getCachedTransactions(address, chainId);

            if (result.transactions.length > 0) {
              // Cache the new transactions
              const lastTransaction = result.transactions[result.transactions.length - 1];
              const newLastBlock = lastTransaction.blockNumber;

              if (cached) {
                await TransactionCacheLib.appendTransactions(
                  address,
                  chainId,
                  result.transactions,
                  newLastBlock
                );

                // Get updated cache for return
                const updatedCache = await TransactionCacheLib.getCachedTransactions(address, chainId);
                if (updatedCache) {
                  result.transactions = updatedCache.transactions;
                }
              } else {
                await TransactionCacheLib.cacheTransactions(
                  address,
                  chainId,
                  result.transactions,
                  newLastBlock
                );
              }
            } else if (cached && cached.transactions.length > 0) {
              // No new transactions found, but we have cached data - use it
              console.log(`📋 NO NEW TRANSACTIONS [Chain ${chainId}]: Using existing cache`, {
                address: address.slice(0, 8) + '...',
                chainId,
                cachedTransactions: cached.transactions.length,
                lastBlock: cached.lastBlock,
              });

              result.transactions = cached.transactions;
            }
          }
          
          results.push({
            chainId,
            transactions: result.transactions,
            nextPageParam: result.nextPageParam,
            hasMore: !!result.nextPageParam,
          });
          
          if (result.nextPageParam) {
            nextLastBlocks[chainId] = result.nextPageParam;
          }
        } catch (error) {
          console.warn(`Failed to fetch transactions for chain ${chainId}:`, error);

          // If fetch failed but we have cached data, use the cached data as fallback
          if (enableCache) {
            const cached = await TransactionCacheLib.getCachedTransactions(address, chainId);
            if (cached && cached.transactions.length > 0) {
              console.log(`🔄 FALLBACK TO CACHE [Chain ${chainId}]: Using cached data after API failure`, {
                address: address.slice(0, 8) + '...',
                chainId,
                cachedTransactions: cached.transactions.length,
                lastBlock: cached.lastBlock,
                cacheAge: Math.round((Date.now() - cached.lastFetch) / 1000) + 's ago',
              });

              results.push({
                chainId,
                transactions: cached.transactions,
                nextPageParam: undefined,
                hasMore: false,
              });
              continue;
            }
          }

          // No cached data available, return empty result
          console.log(`❌ NO FALLBACK [Chain ${chainId}]: No cached data available after API failure`);
          results.push({
            chainId,
            transactions: [],
            nextPageParam: undefined,
            hasMore: false,
          });
        }
      }

      // Log summary of multi-chain results
      const totalTransactions = results.reduce((total, result) => total + result.transactions.length, 0);
      const chainsWithData = results.filter(result => result.transactions.length > 0).length;
      const cacheHits = results.filter(result => result.transactions.length > 0 && !result.hasMore).length;

      console.log('📊 MULTI-CHAIN SUMMARY:', {
        address: address.slice(0, 8) + '...',
        totalChains: chainIds.length,
        chainsWithData,
        totalTransactions,
        cacheHits: `${cacheHits}/${chainIds.length} chains`,
        performance: cacheHits > 0 ? '⚡ Cache boosted!' : '🔄 Fresh fetch',
      });

      return {
        results,
        nextLastBlocks: Object.keys(nextLastBlocks).length > 0 ? nextLastBlocks : undefined,
      };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: MultiChainTransactionPage) => lastPage.nextLastBlocks,
    enabled: enabled && !!address && chainIds.length > 0,
    staleTime: CACHE_EXPIRY_TIME,
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
