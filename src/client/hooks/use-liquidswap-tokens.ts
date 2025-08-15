import { useQuery } from "@tanstack/react-query";
import { fetchTokens, fetchBalances } from "@/client/services/liquidswap-api";
import { FetchTokenResponse, FetchBalancesResponse, Token, Balance } from "@/client/types/liquidswap-api";
import QueryKeys from "@/client/utils/query-keys";
import useWalletStore from "./use-wallet-store";

export const useLiquidSwapTokens = (limit: number = 200) => {
    const { getActiveAccountWalletObject } = useWalletStore();
    const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

    // Fetch all available tokens
    const tokensQuery = useQuery({
        queryKey: [QueryKeys.LIQUIDSWAP_TOKENS, limit],
        queryFn: async (): Promise<FetchTokenResponse> => {
            const response = await fetchTokens({
                limit,
                metadata: true
            });

            return response;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
    });

    // Fetch user balances
    const balancesQuery = useQuery({
        queryKey: [QueryKeys.LIQUIDSWAP_BALANCES, activeAccountAddress],
        queryFn: async (): Promise<FetchBalancesResponse> => {
            if (!activeAccountAddress) {
                throw new Error("No active account address");
            }
            return await fetchBalances({
                wallet: activeAccountAddress,
                limit: 200
            });
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        enabled: !!activeAccountAddress,
    });

    return {
        // Tokens data
        tokens: (tokensQuery.data?.data?.tokens || []) as Token[],
        isLoadingTokens: tokensQuery.isLoading,
        tokensError: tokensQuery.error,
        refetchTokens: tokensQuery.refetch,

        // Balances data
        balances: (balancesQuery.data?.data?.tokens || []) as Balance[],
        isLoadingBalances: balancesQuery.isLoading,
        balancesError: balancesQuery.error,
        refetchBalances: balancesQuery.refetch,

        // Combined loading state
        isLoading: tokensQuery.isLoading || balancesQuery.isLoading,
        hasError: !!tokensQuery.error || !!balancesQuery.error,

        // Refetch both
        refetchAll: () => {
            tokensQuery.refetch();
            balancesQuery.refetch();
        }
    };
};

export default useLiquidSwapTokens;
