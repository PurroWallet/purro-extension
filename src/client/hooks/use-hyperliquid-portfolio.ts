import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchSpotAssetsContext, fetchUserSpotBalance, fetchUserPerpsBalance } from "../services/hyperliquid-api";
import { fetchSpotTokenDetails } from "../services/hyperliquid-api";
import { fetchTokenPrices } from "../services/gecko-terminal-api";
import { fetchHyperEvmERC20Tokens } from "../services/hyperscan-api";
import QueryKeys from "../utils/query-keys";
import useWalletStore from "./use-wallet-store";
import SpotDataIndexer from "../lib/spot-data-indexer";
import { HyperliquidApiSpotAssetContext } from "../types/hyperliquid-api";
import { HyperScanTokenBalanceResponse } from "../types/hyperscan-api";
import { useMemo } from "react";

// Constants for easy customization
const ADDRESS_VALIDATION_REGEX = /^0x[a-fA-F0-9]{40}$/;

interface PortfolioOptions {
    fetchSpot?: boolean;
    fetchPerps?: boolean;
    fetchEvm?: boolean;
}

export const useHlPortfolioData = (
    options: PortfolioOptions = {
        fetchSpot: true,
        fetchPerps: true,
        fetchEvm: true,
    }
) => {
    const { getActiveAccountWalletObject } = useWalletStore();
    const activeWallet = getActiveAccountWalletObject();
    const userAddress = activeWallet?.eip155?.address || '';
    const { fetchSpot = true, fetchPerps = true, fetchEvm = true } = options;

    // Helper function to validate address
    const isValidAddress = (addr: string): boolean => {
        return !!addr && ADDRESS_VALIDATION_REGEX.test(addr);
    };

    // Xây dựng mảng queries dựa trên options
    const queries = [];

    // Thêm spot queries nếu cần
    if (fetchSpot) {
        queries.push(
            {
                queryKey: [QueryKeys.SPOT_USER_BALANCE, userAddress],
                queryFn: () => fetchUserSpotBalance(userAddress),
                staleTime: 60 * 1000, // 60 seconds
                enabled: isValidAddress(userAddress),
            },
            {
                queryKey: [QueryKeys.SPOT_ASSETS],
                queryFn: () => fetchSpotAssetsContext(),
                staleTime: 60 * 1000, // 60 seconds
            }
        );
    }

    // Thêm perps query nếu cần
    if (fetchPerps) {
        queries.push({
            queryKey: [QueryKeys.PERPS_USER_BALANCE, userAddress],
            queryFn: () => fetchUserPerpsBalance(userAddress),
            staleTime: 60 * 1000, // 60 seconds
            enabled: isValidAddress(userAddress),
        });
    }

    // Thêm evm tokens query nếu cần
    if (fetchEvm) {
        queries.push({
            queryKey: [QueryKeys.HYPER_EVM_ERC20_TOKENS, userAddress],
            queryFn: () => fetchHyperEvmERC20Tokens(userAddress),
            staleTime: 60 * 1000, // 60 seconds
            enabled: isValidAddress(userAddress),
        });
    }

    // Sử dụng React Query để fetch dữ liệu
    const results = useQueries({
        queries,
    });

    // Xử lý kết quả và gán vào các biến tương ứng
    let indexResults = 0;

    // Mặc định các query với trạng thái không fetch
    const defaultQuery = {
        data: null,
        isLoading: false,
        error: null,
        refetch: () => Promise.resolve(),
    };

    // Gán kết quả hoặc giá trị mặc định dựa trên options
    const spotBalanceQuery = fetchSpot ? results[indexResults++] : defaultQuery;
    const spotContextQuery = fetchSpot ? results[indexResults++] : defaultQuery;
    const perpsBalanceQuery = fetchPerps ? results[indexResults++] : defaultQuery;
    const evmTokensQuery = fetchEvm ? results[indexResults++] : defaultQuery;

    // Process spot data
    const spotIndexer = useMemo(() => {
        if (!fetchSpot) return null;

        const contextData = spotContextQuery.data;
        if (!contextData || !Array.isArray(contextData) || contextData.length < 2) {
            return null;
        }
        try {
            return new SpotDataIndexer(contextData as HyperliquidApiSpotAssetContext);
        } catch (error) {
            console.error('Error creating SpotDataIndexer:', error);
            return null;
        }
    }, [fetchSpot, spotContextQuery.data]);

    const userSpotBalances = useMemo(() => {
        if (!fetchSpot) return [];

        const balanceData = spotBalanceQuery.data;
        if (!spotIndexer || !balanceData) {
            return [];
        }
        return spotIndexer.processUserBalances(balanceData);
    }, [fetchSpot, spotIndexer, spotBalanceQuery.data]);

    const spotValue = useMemo(() => {
        if (!fetchSpot || !userSpotBalances.length) return 0;
        return spotIndexer?.getPortfolioValue(userSpotBalances) || 0;
    }, [fetchSpot, userSpotBalances, spotIndexer]);

    // Fetch token prices if we have evmTokens
    const tokenAddresses = useMemo(() => {
        if (!fetchEvm) return [];
        return (
            evmTokensQuery.data?.items?.map(
                (item: HyperScanTokenBalanceResponse) => item.token.address
            ) || []
        );
    }, [fetchEvm, evmTokensQuery.data]);

    const tokenPricesQuery = useQuery({
        queryKey: [QueryKeys.HYPER_EVM_TOKEN_PRICES, tokenAddresses],
        queryFn: () => fetchTokenPrices('hyperevm', tokenAddresses),
        staleTime: 60 * 1000, // 60 seconds
        enabled: tokenAddresses.length > 0,
    });

    // Process token prices data
    const tokenPricesData = useMemo(() => {
        if (!tokenPricesQuery.data?.data?.attributes?.token_prices) {
            return {};
        }
        return tokenPricesQuery.data.data.attributes.token_prices as { [key: string]: string };
    }, [tokenPricesQuery.data]);

    // Calculate EVM tokens value
    const evmValue = useMemo(() => {
        if (!fetchEvm || !evmTokensQuery.data?.items) return 0;

        return evmTokensQuery.data.items.reduce((total: number, item: HyperScanTokenBalanceResponse) => {
            const priceStr = tokenPricesData[item.token.address];
            const price = priceStr ? parseFloat(priceStr) : 0;
            const balance = parseFloat(item.value) / Math.pow(10, parseInt(item.token.decimals));
            return total + (balance * price);
        }, 0);
    }, [fetchEvm, evmTokensQuery.data, tokenPricesData]);

    // Calculate perps value
    const perpsValue = useMemo(() => {
        if (!fetchPerps || !perpsBalanceQuery.data) return 0;

        try {
            const perpsData = perpsBalanceQuery.data;
            if (!perpsData || !perpsData.assetPositions) return 0;

            return Object.values(perpsData.assetPositions).reduce((total: number, position: any) => {
                const notionalUsd = parseFloat(position.notionalUsd || '0');
                return total + notionalUsd;
            }, 0);
        } catch (error) {
            console.error('Error calculating perps value:', error);
            return 0;
        }
    }, [fetchPerps, perpsBalanceQuery.data]);

    // Calculate total value
    const totalValue = spotValue + evmValue + perpsValue;

    // Prepare return data
    const evmData = {
        tokensData: evmTokensQuery.data,
        tokenPricesData,
    };

    return {
        // Individual data
        spotData: {
            balances: userSpotBalances,
            context: spotContextQuery.data,
        },
        perpsData: perpsBalanceQuery.data,
        evmData,

        // Individual values
        spotValue,
        evmValue,
        perpsValue,
        totalValue,

        // Loading states
        isSpotLoading: spotBalanceQuery.isLoading || spotContextQuery.isLoading,
        isPerpsLoading: perpsBalanceQuery.isLoading,
        isEvmLoading: evmTokensQuery.isLoading,
        isLoading: spotBalanceQuery.isLoading || spotContextQuery.isLoading || perpsBalanceQuery.isLoading || evmTokensQuery.isLoading,

        // Error states
        spotError: spotBalanceQuery.error || spotContextQuery.error,
        perpsError: perpsBalanceQuery.error,
        evmError: evmTokensQuery.error,
        hasError: !!(spotBalanceQuery.error || spotContextQuery.error || perpsBalanceQuery.error || evmTokensQuery.error),

        // Refetch functions
        refetchSpot: () => {
            spotBalanceQuery.refetch();
            spotContextQuery.refetch();
        },
        refetchPerps: perpsBalanceQuery.refetch,
        refetchEvm: evmTokensQuery.refetch,
        refetchAll: () => {
            spotBalanceQuery.refetch();
            spotContextQuery.refetch();
            perpsBalanceQuery.refetch();
            evmTokensQuery.refetch();
        },
    };
};
