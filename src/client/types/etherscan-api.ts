// Etherscan API Types

export interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanTransaction[];
}

export interface TransactionParams {
  address: string;
  chainId: number;
  startBlock?: string;
  endBlock?: string;
  sort?: 'asc' | 'desc';
  offset?: number;
  page?: number;
}

export interface TransactionPage {
  transactions: EtherscanTransaction[];
  nextPageParam?: string;
  chainId: number;
}

export interface MultiChainTransactionParams {
  address: string;
  chainIds: number[];
  lastBlocks?: Record<number, string>; // chainId -> lastBlock mapping
  sort?: 'asc' | 'desc';
  offset?: number;
  page?: number;
}

export interface UseInfiniteTransactionsOptions {
  enabled?: boolean;
  sort?: 'asc' | 'desc';
  offset?: number;
  lastBlocks?: Record<number, string>; // chainId -> lastBlock mapping for pagination
}

export interface UseTransactionsOptions {
  enabled?: boolean;
  sort?: 'asc' | 'desc';
  offset?: number;
  startBlock?: string;
  endBlock?: string;
  page?: number;
}

export interface ChainTransactionResult {
  chainId: number;
  transactions: EtherscanTransaction[];
  nextPageParam?: string;
  hasMore: boolean;
}

export interface MultiChainTransactionPage {
  results: ChainTransactionResult[];
  nextLastBlocks?: Record<number, string>;
}

// Transaction cache types
export interface CachedTransactionData {
  transactions: EtherscanTransaction[];
  lastBlock: string;
  lastFetch: number;
  chainId: number;
}

export interface TransactionCache {
  [address: string]: {
    [chainId: string]: CachedTransactionData;
  };
}

export interface UseCachedTransactionsOptions extends UseTransactionsOptions {
  enableCache?: boolean;
}

export interface UseCachedInfiniteTransactionsOptions
  extends UseInfiniteTransactionsOptions {
  enableCache?: boolean;
}
