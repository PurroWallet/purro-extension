import { useState, useMemo } from 'react';
import { useCachedInfiniteTransactions } from '@/client/hooks/use-transaction-cache';
import type {
  MultiChainTransactionPage,
  ChainTransactionResult,
} from '@/client/types/etherscan-api';
import type { TransactionWithChain, TokenInfo } from '../types';
import {
  analyzeTransactionMethod,
  isLikelyTokenTransfer,
  extractTokenInfoFromTransaction,
} from '../utils/transaction-utils';
import { fetchTokenMetadata } from '../utils/token-utils';
import { ChainTypeClient } from '@/types/wallet';
import {
  CHAIN_IDS,
  type ChainFilter,
} from '@/client/constants/chain-filter-options';

export const useTransactionProcessing = (
  address: string | undefined,
  chainFilter: ChainFilter
) => {
  // Get active chain IDs based on filter
  const activeChainIds = useMemo(() => {
    if (chainFilter === 'all') {
      return Object.values(CHAIN_IDS);
    }
    return [CHAIN_IDS[chainFilter as keyof typeof CHAIN_IDS]];
  }, [chainFilter]);

  // Fetch transactions using the cached hook
  const { data, fetchNextPage, hasNextPage, isLoading, error } =
    useCachedInfiniteTransactions(address || '', activeChainIds, {
      enabled: !!address,
      sort: 'desc', // Most recent first
      offset: 100,
      enableCache: true, // Enable caching for better performance
    });

  // Token metadata cache to avoid repeated API calls
  const [tokenMetadataCache, setTokenMetadataCache] = useState<
    Map<string, TokenInfo>
  >(new Map());

  // Process and filter transactions
  const processedTransactions = useMemo(() => {
    if (!data || !address) return [];

    const allTransactions: TransactionWithChain[] = [];

    // Flatten all transactions from all pages and chains
    // Handle both possible data structures from useInfiniteQuery
    const pages = 'pages' in data ? data.pages : data;

    if (Array.isArray(pages)) {
      pages.forEach((page: MultiChainTransactionPage, _pageIndex: number) => {
        page.results.forEach((result: ChainTransactionResult) => {
          result.transactions.forEach(tx => {
            const chainName =
              (Object.keys(CHAIN_IDS).find(
                key =>
                  CHAIN_IDS[key as keyof typeof CHAIN_IDS] === result.chainId
              ) as ChainTypeClient) || 'ethereum';

            const type: 'send' | 'receive' =
              tx.from.toLowerCase() === address.toLowerCase()
                ? 'send'
                : 'receive';

            // Analyze transaction to get method and token info
            const analysis = analyzeTransactionMethod(tx, address);

            // For token transfers, try to extract token info from transaction data
            let tokenInfo: TokenInfo | undefined;
            let tokenAmount: string | undefined;
            let outputTokenInfo: TokenInfo | undefined;
            let outputTokenAmount: string | undefined;

            // Enhanced token detection
            const isTokenTx =
              analysis.isTokenTransfer || isLikelyTokenTransfer(tx);

            if (isTokenTx) {
              // Extract token information from decoded transaction data
              const extractedInfo = extractTokenInfoFromTransaction(tx);
              const tokenAddress = extractedInfo.tokenAddress || tx.to;

              // Helper function to get or fetch token info
              const getTokenInfo = (address: string): TokenInfo => {
                const cacheKey = `${result.chainId}-${address.toLowerCase()}`;
                let info = tokenMetadataCache.get(cacheKey);

                if (!info) {
                  info = {
                    address: address,
                    name: 'Loading...',
                    symbol: 'LOADING',
                    decimals: 18,
                    logo: undefined,
                  };

                  // Fetch token metadata asynchronously
                  fetchTokenMetadata(address, result.chainId)
                    .then(metadata => {
                      setTokenMetadataCache(
                        prev => new Map(prev.set(cacheKey, metadata))
                      );
                    })
                    .catch(error => {
                      console.error('Error fetching token metadata:', error);
                    });
                }

                return info;
              };

              // Process input token
              if (tokenAddress) {
                tokenInfo = getTokenInfo(tokenAddress);

                // Use extracted token amount if available, otherwise use ETH value
                if (extractedInfo.tokenAmount) {
                  tokenAmount = extractedInfo.tokenAmount;
                } else if (tx.value === '0' || tx.value === '') {
                  tokenAmount = '0';
                } else {
                  tokenAmount = tx.value;
                }
              }

              // Process output token for swaps
              if (
                analysis.method === 'swap' &&
                extractedInfo.outputTokenAddress
              ) {
                outputTokenInfo = getTokenInfo(
                  extractedInfo.outputTokenAddress
                );
                outputTokenAmount = extractedInfo.outputTokenAmount || '0';
              }
            }

            allTransactions.push({
              ...tx,
              chainId: result.chainId,
              chainName,
              type,
              method: analysis.method,
              isTokenTransfer: isTokenTx,
              tokenInfo,
              tokenAmount,
              outputTokenInfo,
              outputTokenAmount,
            });
          });
        });
      });
    }

    // Sort by timestamp (most recent first)
    const sorted = allTransactions.sort(
      (a, b) => parseInt(b.timeStamp || '0') - parseInt(a.timeStamp || '0')
    );

    return sorted;
  }, [data, address, tokenMetadataCache]);

  return {
    processedTransactions,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error,
  };
};
