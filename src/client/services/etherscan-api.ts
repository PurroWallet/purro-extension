import { ENDPOINTS } from './endpoints';
import type {
  EtherscanResponse,
  TransactionParams,
  TransactionPage,
} from '@/client/types/etherscan-api';

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
  searchParams: Record<string, any>
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
  const {
    address,
    chainId,
    startBlock = '0',
    endBlock = 'latest',
    sort = 'asc',
    offset = 1000,
    page = 1,
    pageParam,
  } = params;

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

  const response = await callEtherscan(
    ACTIONS.get_list_normal_txs,
    searchParams
  );

  if (response.status !== '1') {
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

// Export utility functions for use in hooks
export { splitChainIds, fetchTransactionsForChain, callEtherscan, ACTIONS };

// Legacy function for backward compatibility
export const getListNormalTxs = async (
  address: string,
  chainIds: string[],
  page: number,
  offset: number,
  lastBlocks: string[], // Array of lastBlocks for each chain
  sort: 'asc' | 'desc'
) => {
  const chainId = parseInt(chainIds[0] || '1');
  const startBlock = lastBlocks[0] || '0'; // Use first lastBlock or default to '0'

  const result = await fetchTransactionsForChain({
    address,
    chainId,
    startBlock,
    endBlock: 'latest',
    sort,
    offset,
    page,
  });

  return {
    status: true,
    message: 'OK',
    result: result.transactions,
    nextLastBlock: result.nextPageParam, // Return the next lastBlock for pagination
  };
};
