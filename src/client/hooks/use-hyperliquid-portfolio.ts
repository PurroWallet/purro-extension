import { useQueries, useQuery } from '@tanstack/react-query';
import {
  fetchSpotAssetsContext,
  fetchUserSpotBalance,
  fetchUserPerpsBalance,
} from '../services/hyperliquid-api';
import { fetchTokensInfoByAddresses } from '../services/gecko-terminal-api';
import { fetchBalances } from '../services/liquidswap-api';
import QueryKeys from '../utils/query-keys';
import useWalletStore from './use-wallet-store';
import SpotDataIndexer from '../lib/spot-data-indexer';
import { HyperliquidApiSpotAssetContext } from '../types/hyperliquid-api';
import { FetchBalancesResponse } from '../types/liquidswap-api';
import { useEffect, useMemo } from 'react';
import useDevModeStore from './use-dev-mode';

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
  const { isDevMode } = useDevModeStore();

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
        queryFn: () => fetchUserSpotBalance(userAddress, isDevMode),
        staleTime: 60 * 1000, // 60 seconds
        enabled: isValidAddress(userAddress),
      },
      {
        queryKey: [QueryKeys.SPOT_ASSETS],
        queryFn: () => fetchSpotAssetsContext(isDevMode),
        staleTime: 60 * 1000, // 60 seconds
      }
    );
  }

  // Thêm perps query nếu cần
  if (fetchPerps) {
    queries.push({
      queryKey: [QueryKeys.PERPS_USER_BALANCE, userAddress],
      queryFn: () => fetchUserPerpsBalance(userAddress, isDevMode),
      staleTime: 60 * 1000, // 60 seconds
      enabled: isValidAddress(userAddress),
    });
  }

  // Thêm evm tokens query nếu cần
  if (fetchEvm) {
    queries.push({
      queryKey: [QueryKeys.LIQUIDSWAP_BALANCES, userAddress],
      queryFn: async () => {
        const response = await fetchBalances({
          wallet: userAddress,
          limit: 200
        });
        return response;
      },
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
    const evmData = evmTokensQuery.data as FetchBalancesResponse | null;
    return (
      evmData?.data?.tokens?.map(
        (token) => token.token
      ) || []
    );
  }, [fetchEvm, evmTokensQuery.data]);

  const tokenPricesQuery = useQuery({
    queryKey: [QueryKeys.HYPER_EVM_TOKEN_PRICES, tokenAddresses],
    queryFn: () => fetchTokensInfoByAddresses('hyperevm', tokenAddresses),
    staleTime: 60 * 1000, // 60 seconds
    enabled: tokenAddresses.length > 0,
  });

  // Process token prices data
  const tokenPricesData = useMemo(() => {
    const response = tokenPricesQuery.data;

    // Handle new multi-token API response format
    if (response?.data && Array.isArray(response.data)) {
      const pricesMap: { [key: string]: string } = {};
      response.data.forEach((tokenData: any) => {
        const address = tokenData.attributes.address.toLowerCase();
        pricesMap[address] = tokenData.attributes.price_usd;
      });
      return pricesMap;
    }

    // Fallback to old format
    if (response?.data?.attributes?.token_prices) {
      return response.data.attributes.token_prices as {
        [key: string]: string;
      };
    }

    return {};
  }, [tokenPricesQuery.data]);

  // Calculate EVM tokens value
  const evmValue = useMemo(() => {
    if (!fetchEvm) return 0;
    const evmData = evmTokensQuery.data as FetchBalancesResponse | null;
    if (!evmData?.data?.tokens) return 0;

    return evmData.data.tokens.reduce(
      (total: number, token) => {
        // Try both original address and lowercase for price lookup
        const tokenAddress = token.token.toLowerCase();
        const priceStr = tokenPricesData[tokenAddress] || tokenPricesData[token.token];
        const price = priceStr ? parseFloat(priceStr) : 0;
        const balance =
          parseFloat(token.balance) / Math.pow(10, token.decimals);
        return total + balance * price;
      },
      0
    );
  }, [fetchEvm, evmTokensQuery.data, tokenPricesData]);

  // Calculate perps value
  const perpsValue = useMemo(() => {
    if (!fetchPerps || !perpsBalanceQuery.data) return 0;

    try {
      const perpsData = perpsBalanceQuery.data;
      if (!perpsData || !perpsData.assetPositions) return 0;

      return Object.values(perpsData.assetPositions).reduce(
        (total: number, position: any) => {
          const notionalUsd = parseFloat(position.notionalUsd || '0');
          return total + notionalUsd;
        },
        0
      );
    } catch (error) {
      console.error('Error calculating perps value:', error);
      return 0;
    }
  }, [fetchPerps, perpsBalanceQuery.data]);

  // Calculate total value
  const totalValue = spotValue + evmValue + perpsValue;

  // Prepare return data
  const evmData = {
    tokensData: evmTokensQuery.data as FetchBalancesResponse | null,
    tokenPricesData,
  };

  useEffect(() => {
    (async () => {
      spotBalanceQuery.refetch();
      spotContextQuery.refetch();
      perpsBalanceQuery.refetch();
      evmTokensQuery.refetch();
    })();
  }, [isDevMode]);

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
    isLoading:
      spotBalanceQuery.isLoading ||
      spotContextQuery.isLoading ||
      perpsBalanceQuery.isLoading ||
      evmTokensQuery.isLoading,

    // Error states
    spotError: spotBalanceQuery.error || spotContextQuery.error,
    perpsError: perpsBalanceQuery.error,
    evmError: evmTokensQuery.error,
    hasError: !!(
      spotBalanceQuery.error ||
      spotContextQuery.error ||
      perpsBalanceQuery.error ||
      evmTokensQuery.error
    ),

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
