import { useQueries } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { HyperliquidApiSpotAssetContext } from '@/client/types/hyperliquid-api';
import { HyperScanTokenBalanceResponse } from '@/client/types/hyperscan-api';
import { fetchHyperEvmTokenPrices } from '@/client/services/gecko-terminal-api';
import { fetchUserPerpsBalance } from '@/client/services/hyperliquid-api';
import { fetchSpotAssetsContext } from '@/client/services/hyperliquid-api';
import QueryKeys from '@/client/utils/query-keys';
import { fetchUserSpotBalance } from '@/client/services/hyperliquid-api';
import { fetchHyperEvmERC20Tokens } from '@/client/services/hyperscan-api';
import useWalletStore from './use-wallet-store';
import SpotDataIndexer from '../lib/spot-data-indexer';

// Thêm interface cho options
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

    // Xây dựng mảng queries dựa trên options
    const queries = [];

    // Thêm spot queries nếu cần
    if (fetchSpot) {
        queries.push(
            {
                queryKey: [QueryKeys.SPOT_USER_BALANCE, userAddress],
                queryFn: () => fetchUserSpotBalance(userAddress),
                staleTime: 60 * 1000, // 60 seconds
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
        });
    }

    // Thêm evm tokens query nếu cần
    if (fetchEvm) {
        queries.push({
            queryKey: [QueryKeys.HYPER_EVM_ERC20_TOKENS, userAddress],
            queryFn: () => fetchHyperEvmERC20Tokens(userAddress),
            staleTime: 60 * 1000, // 60 seconds
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

    const tokenPricesQuery = useQueries({
        queries: [
            {
                queryKey: [QueryKeys.HYPER_EVM_TOKEN_PRICES, tokenAddresses],
                queryFn: () =>
                    tokenAddresses.length > 0
                        ? fetchHyperEvmTokenPrices(tokenAddresses)
                        : Promise.resolve(null),
                staleTime: 60 * 1000, // 60 seconds
                enabled: fetchEvm && tokenAddresses.length > 0, // Chỉ run nếu fetchEvm=true và có token addresses
            },
        ],
    })[0];

    // Calculate EVM value
    const tokenPricesData = useMemo(() => {
        if (!fetchEvm) return {};
        // Đảm bảo chỉ trả về data khi đã load xong và có data
        if (tokenPricesQuery.isLoading || !tokenPricesQuery.data?.data?.attributes?.token_prices) {

            return {};
        }
        return tokenPricesQuery.data.data.attributes.token_prices;
    }, [fetchEvm, tokenPricesQuery.data, tokenPricesQuery.isLoading]);

    const evmValue = useMemo(() => {
        // Trả về 0 nếu đang loading hoặc chưa có data
        if (!fetchEvm || !evmTokensQuery.data?.items) return 0;

        // Nếu có tokens nhưng prices đang loading, trả về 0 để tránh flash
        if (tokenAddresses.length > 0 && tokenPricesQuery.isLoading) return 0;

        // Nếu không có token addresses, có thể có native token
        if (tokenAddresses.length === 0) return 0;

        const calculatedValue = evmTokensQuery.data.items.reduce(
            (total: number, item: HyperScanTokenBalanceResponse) => {
                const value = parseFloat(item.value) / Math.pow(10, parseFloat(item.token.decimals));
                const tokenAddress = item.token.address.toLowerCase();
                const price =
                    tokenPricesData && tokenAddress in tokenPricesData
                        ? parseFloat(tokenPricesData[tokenAddress])
                        : 0;

                // Đảm bảo không có NaN
                const itemValue = (isNaN(value) ? 0 : value) * (isNaN(price) ? 0 : price);
                return total + (isNaN(itemValue) ? 0 : itemValue);
            },
            0
        );

        // Đảm bảo trả về số hợp lệ
        return isNaN(calculatedValue) ? 0 : calculatedValue;
    }, [fetchEvm, evmTokensQuery.data, tokenPricesData, tokenPricesQuery.isLoading, tokenAddresses.length]);

    // Calculate perps value
    const perpsValue = useMemo(() => {
        if (!fetchPerps) return 0;



        if (!perpsBalanceQuery.data?.marginSummary?.accountValue) return 0;
        return parseFloat(perpsBalanceQuery.data.marginSummary.accountValue);
    }, [fetchPerps, perpsBalanceQuery.data, perpsBalanceQuery.isLoading, perpsBalanceQuery.error]);

    // Check loading and error states
    const isSpotLoading = fetchSpot && (spotBalanceQuery.isLoading || spotContextQuery.isLoading);
    const isPerpsLoading = fetchPerps && perpsBalanceQuery.isLoading;
    const isEvmLoading =
        fetchEvm &&
        (evmTokensQuery.isLoading ||
            (tokenAddresses.length > 0 && tokenPricesQuery.isLoading));

    // Use state to keep stable value and prevent flash to 0
    const [stableValue, setStableValue] = useState(0);

    // Calculate total portfolio value
    const totalValue = useMemo(() => {
        // Only include values from enabled features
        const safeSpotValue = fetchSpot && !isNaN(spotValue) ? spotValue : 0;
        const safePerpsValue = fetchPerps && !isNaN(perpsValue) ? perpsValue : 0;
        const safeEvmValue = fetchEvm && !isNaN(evmValue) ? evmValue : 0;

        const currentValue = safeSpotValue + safePerpsValue + safeEvmValue;

        return isNaN(currentValue) ? 0 : currentValue;
    }, [fetchSpot, fetchPerps, fetchEvm, spotValue, perpsValue, evmValue]);

    // Update stable value only when not loading and value is valid
    // Also reset stable value when features are disabled
    useEffect(() => {
        if (!isSpotLoading && !isPerpsLoading && !isEvmLoading && !isNaN(totalValue)) {
            setStableValue(totalValue);
        }
        // Reset stable value if all features are disabled
        if (!fetchSpot && !fetchPerps && !fetchEvm) {
            setStableValue(0);
        }
    }, [totalValue, isSpotLoading, isPerpsLoading, isEvmLoading, fetchSpot, fetchPerps, fetchEvm]);

    // Return stable value if currently loading and we have a previous stable value
    const displayValue = useMemo(() => {
        if ((isSpotLoading || isPerpsLoading || isEvmLoading) && stableValue > 0) {
            return stableValue;
        }
        return totalValue;
    }, [totalValue, stableValue, isSpotLoading, isPerpsLoading, isEvmLoading]);

    const spotError = fetchSpot && (spotBalanceQuery.error || spotContextQuery.error);
    const perpsError = fetchPerps && perpsBalanceQuery.error;
    const evmError = fetchEvm && (evmTokensQuery.error || tokenPricesQuery.error);

    // Combine all data for easy access
    return {
        // Portfolio values
        totalValue: displayValue,
        spotValue: fetchSpot ? spotValue : 0,
        perpsValue: fetchPerps ? perpsValue : 0,
        evmValue: fetchEvm ? evmValue : 0,

        // Loading states
        isSpotLoading,
        isPerpsLoading,
        isEvmLoading,
        isLoading: isSpotLoading || isPerpsLoading || isEvmLoading,

        // Error states
        spotError,
        perpsError,
        evmError,
        hasError: !!spotError || !!perpsError || !!evmError,

        // Raw data
        spotData: fetchSpot
            ? {
                balanceData: spotBalanceQuery.data,
                contextData: spotContextQuery.data,
                userBalances: userSpotBalances,
                indexer: spotIndexer,
            }
            : null,
        perpsData: fetchPerps ? perpsBalanceQuery.data : null,
        evmData: fetchEvm
            ? {
                tokensData: evmTokensQuery.data,
                tokenPricesData,
            }
            : null,

        // Refetch functions
        refetchAll: () => {
            const promises = [];
            if (fetchSpot) {
                promises.push(spotBalanceQuery.refetch());
                promises.push(spotContextQuery.refetch());
            }
            if (fetchPerps) {
                promises.push(perpsBalanceQuery.refetch());
            }
            if (fetchEvm) {
                promises.push(evmTokensQuery.refetch());
                if (tokenAddresses.length > 0) {
                    promises.push(tokenPricesQuery.refetch());
                }
            }
            return Promise.all(promises);
        },
        refetchSpot: () => {
            if (!fetchSpot) return Promise.resolve();
            return Promise.all([spotBalanceQuery.refetch(), spotContextQuery.refetch()]);
        },
        refetchPerps: () => {
            if (!fetchPerps) return Promise.resolve();
            return perpsBalanceQuery.refetch();
        },
        refetchEvm: async () => {
            if (!fetchEvm) return Promise.resolve();
            const evmPromise = evmTokensQuery.refetch();
            if (tokenAddresses.length > 0) {
                return evmPromise.then(() => tokenPricesQuery.refetch());
            }
            return evmPromise;
        },
    };
};
