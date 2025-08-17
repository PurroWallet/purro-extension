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


        return {
          transactions: cached.transactions,
          nextPageParam: undefined, // No pagination for cached data
          chainId,
        };
      }

      // Determine start block for fetching
      const startBlock = cached ? (parseInt(cached.lastBlock) + 1).toString() : '0';


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


        if (cached) {
          // Append to existing cache
          await TransactionCacheLib.appendTransactions(
            address,
            chainId,
            result.transactions,
            newLastBlock
          );



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


          return result;
        }
      } else if (cached) {


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



      for (const chainId of chainIds) {
        try {
          let startBlock = '0';

          if (enableCache) {
            // Get cached data
            const cached = await TransactionCacheLib.getCachedTransactions(address, chainId);

            if (cached && TransactionCacheLib.isCacheFresh(cached)) {


              results.push({
                chainId,
                transactions: cached.transactions,
                nextPageParam: undefined,
                hasMore: false,
              });
              continue;
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


              results.push({
                chainId,
                transactions: cached.transactions,
                nextPageParam: undefined,
                hasMore: false,
              });
              continue;
            }
          }


          results.push({
            chainId,
            transactions: [],
            nextPageParam: undefined,
            hasMore: false,
          });
        }
      }

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
