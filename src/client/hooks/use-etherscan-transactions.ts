import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type {
  EtherscanResponse,
  TransactionParams,
  TransactionPage,
  UseInfiniteTransactionsOptions,
  UseTransactionsOptions,
  ChainTransactionResult,
  MultiChainTransactionPage,
} from '@/client/types/etherscan-api';
import { ENDPOINTS } from '@/client/services/endpoints';

const API_KEY = 'XE2CRX7TH65UUNW4GNSUGWRD6I4EBJUZSN';
const ACTIONS = {
  get_list_normal_txs: 'txlist',
};

// Rate limiting: 5 calls per second
const RATE_LIMIT_DELAY = 200; // 200ms between calls
const rateLimitQueue: Array<() => void> = [];
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue || rateLimitQueue.length === 0) return;
  
  isProcessingQueue = true;
  while (rateLimitQueue.length > 0) {
    const nextCall = rateLimitQueue.shift();
    if (nextCall) {
      nextCall();
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }
  isProcessingQueue = false;
};

const rateLimitedFetch = async (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    rateLimitQueue.push(async () => {
      try {
        const response = await fetch(url, { method: 'GET' });
        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
};

const callEtherscan = async (
  action: string,
  searchParams: Record<string, string>
): Promise<EtherscanResponse> => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    params.set(key, value);
  }

  const url = `${ENDPOINTS.ETHERSCAN}?module=account&action=${action}&${params.toString()}&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
};

// Split chain IDs into groups to manage rate limiting
const splitChainIds = (chainIds: number[]): number[][] => {
  const groups: number[][] = [];
  const groupSize = 5; // Max 5 chains per group to stay within rate limits
  
  for (let i = 0; i < chainIds.length; i += groupSize) {
    groups.push(chainIds.slice(i, i + groupSize));
  }
  
  return groups;
};

// Fetch transactions for a single chain with pagination
const fetchTransactionsForChain = async (
  params: TransactionParams & { pageParam?: number }
): Promise<TransactionPage> => {
  const { address, chainId, startBlock = '0', endBlock = 'latest', sort = 'asc', offset = 1000, page = 1, pageParam } = params;
  
  const currentPage = pageParam || page;
  
  const searchParams = {
    chainid: chainId.toString(),
    address,
    startblock: startBlock,
    endblock: endBlock,
    sort,
    page: currentPage.toString(),
    offset: offset.toString(),
  };

  const response = await callEtherscan(ACTIONS.get_list_normal_txs, searchParams);

  // Handle various non-error responses that should return empty results
  if (response.status !== '1') {
    const message = response.message?.toLowerCase() || '';

    // These are valid responses that just mean no data, not errors
    if (message.includes('no transactions found') ||
        message.includes('no records found') ||
        message.includes('no data found')) {
      return {
        transactions: [],
        nextPageParam: undefined,
        chainId,
      };
    }

    // For other status !== '1' responses, throw an error
    throw new Error(response.message || 'Failed to fetch transactions');
  }

  const transactions = response.result || [];
  
  // Determine next page parameter
  let nextPageParam: string | undefined;
  
  if (transactions.length === offset) {
    // If we got the max number of records, there might be more
    const lastTransaction = transactions[transactions.length - 1];
    if (lastTransaction) {
      // For next page, use the last block number as startBlock
      nextPageParam = lastTransaction.blockNumber;
    }
  }

  return {
    transactions,
    nextPageParam,
    chainId,
  };
};

// TanStack Query hook for infinite pagination with multi-chain support
export const useInfiniteTransactions = (
  address: string,
  chainIds: number[],
  options?: UseInfiniteTransactionsOptions
) => {
  const { enabled = true, sort = 'asc', offset = 1000, lastBlocks = {} } = options || {};
  
  // Split chains into groups for rate limiting
  const chainGroups = splitChainIds(chainIds);
  
  return useInfiniteQuery<MultiChainTransactionPage, Error, MultiChainTransactionPage[], unknown[], Record<number, string> | undefined>({
    queryKey: ['transactions', address, chainIds, sort, offset, JSON.stringify(lastBlocks)],
    queryFn: async ({ pageParam }) => {
      const currentLastBlocks = pageParam || lastBlocks;
      const results: ChainTransactionResult[] = [];
      const nextLastBlocks: Record<number, string> = {};
      
      // Process each chain group sequentially to respect rate limits
      for (const chainGroup of chainGroups) {
        // Process chains in parallel within each group (max 5)
        const groupPromises = chainGroup.map(async (chainId) => {
          try {
            const startBlock = currentLastBlocks[chainId] || '0';

            const result = await fetchTransactionsForChain({
              address,
              chainId,
              startBlock,
              endBlock: 'latest',
              sort,
              offset,
              page: 1, // Always use page 1 with startBlock for pagination
            });

            return {
              chainId,
              transactions: result.transactions,
              nextPageParam: result.nextPageParam,
              hasMore: !!result.nextPageParam,
            };
          } catch (error) {
            // Log the error but don't fail the entire query
            console.warn(`Failed to fetch transactions for chain ${chainId}:`, error);

            // Return empty result for this chain
            return {
              chainId,
              transactions: [],
              nextPageParam: undefined,
              hasMore: false,
            };
          }
        });
        
        const groupResults = await Promise.all(groupPromises);
        results.push(...groupResults);
        
        // Update nextLastBlocks for chains that have more data
        groupResults.forEach(result => {
          if (result.nextPageParam) {
            nextLastBlocks[result.chainId] = result.nextPageParam;
          }
        });
      }
      
      return {
        results,
        nextLastBlocks: Object.keys(nextLastBlocks).length > 0 ? nextLastBlocks : undefined,
      };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: MultiChainTransactionPage) => lastPage.nextLastBlocks,
    enabled: enabled && !!address && chainIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// TanStack Query hook for single page transactions
export const useTransactions = (
  address: string,
  chainId: number,
  options?: UseTransactionsOptions
) => {
  const { 
    enabled = true, 
    sort = 'asc', 
    offset = 1000,
    startBlock = '0',
    endBlock = 'latest',
    page = 1
  } = options || {};
  
  return useQuery<TransactionPage, Error>({
    queryKey: ['transactions-single', address, chainId, sort, offset, startBlock, endBlock, page],
    queryFn: () => fetchTransactionsForChain({
      address,
      chainId,
      sort,
      offset,
      startBlock,
      endBlock,
      page,
    }),
    enabled: enabled && !!address && !!chainId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
