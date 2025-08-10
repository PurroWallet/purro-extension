import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
    fetchEthereumTokenPrices,
    fetchBaseTokenPrices,
    fetchArbitrumTokenPrices
} from '@/client/services/gecko-terminal-api';
import QueryKeys from '@/client/utils/query-keys';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import useWalletStore from './use-wallet-store';
import { fetchArbitrumTokensOptimized, fetchBaseTokensOptimized, fetchEthereumTokensOptimized } from '../services/alchemy-api';
import useDevModeStore from './use-dev-mode';

export interface AlchemyTokenWithChain {
    chain: 'ethereum' | 'base' | 'arbitrum';
    chainName: string;
    contractAddress: string;
    balance: string;
    name: string;
    symbol: string;
    decimals: number;
    logo?: string;
    balanceFormatted: number;
    usdPrice?: number;
    usdValue?: number;
}

export const useAlchemyTokens = () => {
    const { getActiveAccountWalletObject } = useWalletStore();
    const { isNetworkActive } = useNetworkSettingsStore();
    const { isDevMode } = useDevModeStore();
    const activeWallet = getActiveAccountWalletObject();
    const userAddress = activeWallet?.eip155?.address || '';

    // Check which networks are active
    const isEthereumActive = isNetworkActive('ethereum');
    const isBaseActive = isNetworkActive('base');
    const isArbitrumActive = isNetworkActive('arbitrum');

    // Build queries only for active networks - using optimized functions
    const chainQueries = useMemo(() => {
        // If dev mode is enabled, return empty queries to disable all mainnet calls
        if (isDevMode) {
            return [];
        }

        const queries = [];

        if (isEthereumActive) {
            queries.push({
                queryKey: [QueryKeys.ETHEREUM_TOKENS, userAddress, 'optimized'],
                queryFn: () => fetchEthereumTokensOptimized(userAddress),
                staleTime: 30 * 1000, // Reduced to 30s since metadata is cached
                gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
                enabled: !!userAddress,
            });
        }

        if (isBaseActive) {
            queries.push({
                queryKey: [QueryKeys.BASE_TOKENS, userAddress, 'optimized'],
                queryFn: () => fetchBaseTokensOptimized(userAddress),
                staleTime: 30 * 1000,
                gcTime: 5 * 60 * 1000,
                enabled: !!userAddress,
            });
        }

        if (isArbitrumActive) {
            queries.push({
                queryKey: [QueryKeys.ARBITRUM_TOKENS, userAddress, 'optimized'],
                queryFn: () => fetchArbitrumTokensOptimized(userAddress),
                staleTime: 30 * 1000,
                gcTime: 5 * 60 * 1000,
                enabled: !!userAddress,
            });
        }

        return queries;
    }, [isEthereumActive, isBaseActive, isArbitrumActive, userAddress, isDevMode]);

    // Fetch tokens from active chains only
    const chainResults = useQueries({
        queries: chainQueries,
    });

    // Combine results into the expected format
    const allEvmTokensQuery = useMemo(() => {
        // Add safeguard for undefined chainResults
        if (!chainResults || !Array.isArray(chainResults)) {
            return {
                data: [],
                isLoading: false,
                error: null,
                refetch: () => { }
            };
        }

        const isLoading = chainResults.some(result => result.isLoading);
        const error = chainResults.find(result => result.error)?.error;

        const data = chainResults
            .filter(result => result.data)
            .map(result => result.data)
            .filter(Boolean);

        return {
            data,
            isLoading,
            error,
            refetch: () => {
                chainResults.forEach(result => result.refetch());
            }
        };
    }, [chainResults]);

    // Extract token addresses by chain for pricing
    const tokenAddressesByChain = useMemo(() => {
        if (!allEvmTokensQuery.data) return { ethereum: [], base: [], arbitrum: [] };

        const addresses = { ethereum: [] as string[], base: [] as string[], arbitrum: [] as string[] };

        allEvmTokensQuery.data.forEach((chainData) => {
            if (chainData) {
                const chainAddresses = chainData.tokens.map(token => token.contractAddress);
                addresses[chainData.chain] = chainAddresses;
            }
        });

        return addresses;
    }, [allEvmTokensQuery.data]);

    // Build price queries only for active networks
    const priceQueriesConfig = useMemo(() => {
        // If dev mode is enabled, return empty queries to disable all mainnet price calls
        if (isDevMode) {
            return [];
        }

        const queries = [];

        if (isEthereumActive) {
            queries.push({
                queryKey: [QueryKeys.ETHEREUM_TOKENS, 'prices', tokenAddressesByChain.ethereum],
                queryFn: () => tokenAddressesByChain.ethereum.length > 0
                    ? fetchEthereumTokenPrices(tokenAddressesByChain.ethereum)
                    : Promise.resolve({ data: { attributes: { token_prices: {} } } }),
                staleTime: 2 * 60 * 1000, // 2 minutes for prices
                gcTime: 10 * 60 * 1000,
                enabled: tokenAddressesByChain.ethereum.length > 0,
            });
        }

        if (isBaseActive) {
            queries.push({
                queryKey: [QueryKeys.BASE_TOKENS, 'prices', tokenAddressesByChain.base],
                queryFn: () => tokenAddressesByChain.base.length > 0
                    ? fetchBaseTokenPrices(tokenAddressesByChain.base)
                    : Promise.resolve({ data: { attributes: { token_prices: {} } } }),
                staleTime: 2 * 60 * 1000,
                gcTime: 10 * 60 * 1000,
                enabled: tokenAddressesByChain.base.length > 0,
            });
        }

        if (isArbitrumActive) {
            queries.push({
                queryKey: [QueryKeys.ARBITRUM_TOKENS, 'prices', tokenAddressesByChain.arbitrum],
                queryFn: () => tokenAddressesByChain.arbitrum.length > 0
                    ? fetchArbitrumTokenPrices(tokenAddressesByChain.arbitrum)
                    : Promise.resolve({ data: { attributes: { token_prices: {} } } }),
                staleTime: 2 * 60 * 1000,
                gcTime: 10 * 60 * 1000,
                enabled: tokenAddressesByChain.arbitrum.length > 0,
            });
        }

        return queries;
    }, [isEthereumActive, isBaseActive, isArbitrumActive, tokenAddressesByChain, isDevMode]);

    // Fetch prices for active chains only
    const priceQueries = useQueries({
        queries: priceQueriesConfig,
    });

    // Combine price data from active networks
    const priceDataByChain = useMemo(() => {
        const priceData = {
            ethereum: {} as Record<string, string>,
            base: {} as Record<string, string>,
            arbitrum: {} as Record<string, string>,
        };

        // Map price results back to their respective chains
        let queryIndex = 0;

        if (isEthereumActive && priceQueries[queryIndex]) {
            priceData.ethereum = priceQueries[queryIndex].data?.data?.attributes?.token_prices || {};
            queryIndex++;
        }

        if (isBaseActive && priceQueries[queryIndex]) {
            priceData.base = priceQueries[queryIndex].data?.data?.attributes?.token_prices || {};
            queryIndex++;
        }

        if (isArbitrumActive && priceQueries[queryIndex]) {
            priceData.arbitrum = priceQueries[queryIndex].data?.data?.attributes?.token_prices || {};
        }

        return priceData;
    }, [isEthereumActive, isBaseActive, isArbitrumActive, priceQueries]);

    // Process and combine tokens from all chains with pricing
    const processedTokens = useMemo(() => {
        if (!allEvmTokensQuery.data) return [];

        const tokens: AlchemyTokenWithChain[] = [];

        allEvmTokensQuery.data.forEach((chainData) => {
            if (chainData && chainData.tokens) {
                const chainName = getChainDisplayName(chainData.chain);
                const chainPrices = priceDataByChain[chainData.chain] || {};

                chainData.tokens.forEach((token) => {
                    try {
                        // Safely access metadata with fallbacks
                        const metadata = token.metadata || {
                            name: 'Unknown Token',
                            symbol: 'UNKNOWN',
                            decimals: 18
                        };

                        // Ensure decimals is a valid number
                        const decimals = typeof metadata.decimals === 'number' ? metadata.decimals : 18;

                        // Safely parse balance
                        const balance = token.balance || '0x0';
                        const balanceFormatted = parseInt(balance, 16) / Math.pow(10, decimals);

                        const tokenAddress = token.contractAddress?.toLowerCase() || '';
                        const usdPrice = chainPrices[tokenAddress] ? parseFloat(chainPrices[tokenAddress]) : undefined;
                        const usdValue = usdPrice ? balanceFormatted * usdPrice : undefined;

                        // Only add tokens with valid data
                        if (token.contractAddress && balanceFormatted > 0) {
                            tokens.push({
                                chain: chainData.chain,
                                chainName,
                                contractAddress: token.contractAddress,
                                balance: balance,
                                name: metadata.name || 'Unknown Token',
                                symbol: metadata.symbol || 'UNKNOWN',
                                decimals,
                                logo: metadata.logo,
                                balanceFormatted,
                                usdPrice,
                                usdValue,
                            });
                        }
                    } catch (error) {
                        console.error('Error processing token:', token, error);
                        // Skip this token if there's an error processing it
                    }
                });
            }
        });

        // Sort by USD value (highest to lowest), then by chain and symbol
        return tokens.sort((a, b) => {
            if (a.usdValue && b.usdValue) {
                return b.usdValue - a.usdValue;
            }
            if (a.usdValue && !b.usdValue) return -1;
            if (!a.usdValue && b.usdValue) return 1;

            // If no USD values, sort by chain and symbol
            if (a.chain !== b.chain) {
                return a.chain.localeCompare(b.chain);
            }
            return a.symbol.localeCompare(b.symbol);
        });
    }, [allEvmTokensQuery.data, priceDataByChain]);

    // Group tokens by chain
    const tokensByChain = useMemo(() => {
        const grouped: Record<string, AlchemyTokenWithChain[]> = {
            ethereum: [],
            base: [],
            arbitrum: [],
        };

        processedTokens.forEach((token) => {
            grouped[token.chain].push(token);
        });

        return grouped;
    }, [processedTokens]);

    // Calculate total tokens count and value
    const totalTokensCount = useMemo(() => {
        return processedTokens.length;
    }, [processedTokens]);

    const totalUsdValue = useMemo(() => {
        return processedTokens.reduce((total, token) => {
            return total + (token.usdValue || 0);
        }, 0);
    }, [processedTokens]);

    // Check loading states
    const isLoading = allEvmTokensQuery.isLoading || priceQueries.some(query => query.isLoading);

    const hasError = !!allEvmTokensQuery.error || priceQueries.some(query => !!query.error);

    return {
        // Data
        allTokens: processedTokens,
        tokensByChain,
        totalTokensCount,
        totalUsdValue,

        // Loading states
        isLoading,

        // Error states
        error: allEvmTokensQuery.error || priceQueries.find(query => query.error)?.error,
        hasError,

        // Refetch function
        refetch: () => {
            allEvmTokensQuery.refetch();
            priceQueries.forEach(query => query.refetch());
        },
    };
};

// Helper function to get chain display name
const getChainDisplayName = (chain: 'ethereum' | 'base' | 'arbitrum'): string => {
    switch (chain) {
        case 'ethereum':
            return 'Ethereum';
        case 'base':
            return 'Base';
        case 'arbitrum':
            return 'Arbitrum';
        default:
            return chain;
    }
}; 