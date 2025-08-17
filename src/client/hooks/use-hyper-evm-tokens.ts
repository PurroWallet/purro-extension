import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchTokenPrices } from "@/client/services/gecko-terminal-api";
import { fetchBalances } from "@/client/services/liquidswap-api";
import { FetchBalancesResponse } from "@/client/types/liquidswap-api";
import useWalletStore from "./use-wallet-store";
import useSwapStore from "./use-swap-store";

// Query keys for HyperEVM tokens
export const hyperEvmTokenKeys = {
    all: ['hyperEvmTokens'] as const,
    balances: (address: string) => [...hyperEvmTokenKeys.all, 'balances', address] as const,
    prices: (addresses: string[]) => [...hyperEvmTokenKeys.all, 'prices', addresses] as const,
    tokenData: (address: string) => [...hyperEvmTokenKeys.all, 'tokenData', address] as const,
};

// Interface for processed token data
export interface HyperEvmToken {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
    balanceFormatted: number;
    price: number;
    priceChange24h: number;
    usdValue: number;
    logo?: string;
}

// Hook for HyperEVM token balances
export const useHyperEvmTokenBalances = (address?: string) => {
    return useQuery({
        queryKey: address ? hyperEvmTokenKeys.balances(address) : ['hyperEvmTokens', 'disabled'],
        queryFn: async () => {
            if (!address) throw new Error('Address is required');

            console.log('🔍 Fetching HyperEVM token balances for:', address);
            const response = await fetchBalances({ wallet: address });
            console.log('✅ HyperEVM balances fetched:', response);
            return response;
        },
        enabled: !!address,
        staleTime: 30000, // 30 seconds
        gcTime: 60000, // 1 minute
        refetchInterval: 20000, // Refresh every 20 seconds
        refetchIntervalInBackground: true,
    });
};

// Hook for HyperEVM token prices
export const useHyperEvmTokenPrices = (tokenAddresses: string[]) => {
    const { updateTokenPrice } = useSwapStore();

    return useQuery({
        queryKey: hyperEvmTokenKeys.prices(tokenAddresses),
        queryFn: async () => {
            if (tokenAddresses.length === 0) return null;

            console.log('🔍 Fetching HyperEVM token prices for:', tokenAddresses);
            const response = await fetchTokenPrices('hyperevm', tokenAddresses);
            console.log('✅ HyperEVM prices fetched:', response);

            // Update Zustand store with price data
            if (response?.data && Array.isArray(response.data)) {
                response.data.forEach((tokenData: any) => {
                    const address = tokenData.attributes.address.toLowerCase();
                    const price = parseFloat(tokenData.attributes.price_usd || '0');
                    const priceChange24h = parseFloat(tokenData.attributes.price_change_percentage?.h24 || '0');

                    updateTokenPrice(address, price, priceChange24h);
                });
            }

            return response;
        },
        enabled: tokenAddresses.length > 0,
        staleTime: 15000, // 15 seconds
        gcTime: 30000, // 30 seconds
        refetchInterval: 20000, // Refresh every 20 seconds
        refetchIntervalInBackground: true,
        retry: 2,
    });
};

// Main hook that combines balances and prices
export const useHyperEvmTokens = () => {
    const { getActiveAccountWalletObject } = useWalletStore();
    const { tokenPrices } = useSwapStore();
    const queryClient = useQueryClient();

    const activeAccount = getActiveAccountWalletObject();
    const address = activeAccount?.eip155?.address;

    // Fetch token balances
    const balancesQuery = useHyperEvmTokenBalances(address);

    // Extract token addresses from balances for price fetching
    const tokenAddresses = useMemo(() => {
        const response = balancesQuery.data as FetchBalancesResponse | null;
        if (!response?.data?.tokens) return [];

        return response.data.tokens.map(token => token.token.toLowerCase());
    }, [balancesQuery.data]);

    // Fetch token prices
    const pricesQuery = useHyperEvmTokenPrices(tokenAddresses);

    // Process token prices data
    const processedPrices = useMemo(() => {
        const response = pricesQuery.data;
        if (!response) return {};

        // Handle new multi-token API response format
        if (response?.data && Array.isArray(response.data)) {
            const pricesMap: { [key: string]: { price: number; priceChange24h: number } } = {};
            response.data.forEach((tokenData: any) => {
                const address = tokenData.attributes.address.toLowerCase();
                pricesMap[address] = {
                    price: parseFloat(tokenData.attributes.price_usd || '0'),
                    priceChange24h: parseFloat(tokenData.attributes.price_change_percentage?.h24 || '0'),
                };
            });
            return pricesMap;
        }

        return {};
    }, [pricesQuery.data]);

    // Combine balances and prices into processed tokens
    const processedTokens = useMemo((): HyperEvmToken[] => {
        const response = balancesQuery.data as FetchBalancesResponse | null;
        if (!response?.data?.tokens) return [];

        return response.data.tokens.map(token => {
            const tokenAddress = token.token.toLowerCase();
            const priceData = processedPrices[tokenAddress] || tokenPrices[tokenAddress] || { price: 0, priceChange24h: 0 };
            const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);

            return {
                address: token.token,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                balance: token.balance,
                balanceFormatted: balance,
                price: priceData.price,
                priceChange24h: priceData.priceChange24h,
                usdValue: balance * priceData.price,
            };
        }).filter(token => token.balanceFormatted > 0); // Only show tokens with balance
    }, [balancesQuery.data, processedPrices, tokenPrices]);

    // Calculate total portfolio value
    const totalValue = useMemo(() => {
        return processedTokens.reduce((total, token) => total + token.usdValue, 0);
    }, [processedTokens]);

    // Utility functions
    const invalidateTokenData = () => {
        queryClient.invalidateQueries({
            queryKey: hyperEvmTokenKeys.all,
        });
    };

    const refetchTokenData = () => {
        return Promise.all([
            balancesQuery.refetch(),
            pricesQuery.refetch(),
        ]);
    };

    // Find token by address
    const findTokenByAddress = (address: string): HyperEvmToken | undefined => {
        return processedTokens.find(token =>
            token.address.toLowerCase() === address.toLowerCase()
        );
    };

    // Get token price by address
    const getTokenPrice = (address: string): number => {
        const tokenAddress = address.toLowerCase();
        return processedPrices[tokenAddress]?.price || tokenPrices[tokenAddress]?.price || 0;
    };

    // Get token price change by address
    const getTokenPriceChange = (address: string): number => {
        const tokenAddress = address.toLowerCase();
        return processedPrices[tokenAddress]?.priceChange24h || tokenPrices[tokenAddress]?.priceChange24h || 0;
    };

    return {
        // Data
        tokens: processedTokens,
        totalValue,
        prices: processedPrices,

        // Loading states
        isLoadingBalances: balancesQuery.isLoading,
        isLoadingPrices: pricesQuery.isLoading,
        isLoading: balancesQuery.isLoading || pricesQuery.isLoading,
        isRefetching: balancesQuery.isRefetching || pricesQuery.isRefetching,

        // Error states
        balancesError: balancesQuery.error,
        pricesError: pricesQuery.error,
        error: balancesQuery.error || pricesQuery.error,

        // Utility functions
        invalidateTokenData,
        refetchTokenData,
        findTokenByAddress,
        getTokenPrice,
        getTokenPriceChange,

        // Raw queries for advanced usage
        balancesQuery,
        pricesQuery,
    };
};

export default useHyperEvmTokens; 