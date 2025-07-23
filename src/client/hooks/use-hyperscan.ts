import { useQuery } from "@tanstack/react-query";
import { fetchHyperEvmNfts, fetchHyperEvmNftsCollection, fetchHyperEvmTransactions, fetchHyperEvmNftInstances, fetchHyperEvmTokenTransfers } from "../services/hyperscan-api";
import { HyperScanNftNextPageParams, HyperScanNftCollectionsNextPageParams, HyperScanNftInstancesNextPageParams, HyperScanTokenTransfersNextPageParams } from "../types/hyperscan-api";
import QueryKeys from "../utils/query-keys";
import useWalletStore from "./use-wallet-store";

const useHyperscan = () => {
    const { getActiveAccountWalletObject } = useWalletStore();
    const activeAccount = getActiveAccountWalletObject();
    const address = activeAccount?.eip155?.address;

    const useNFTsCollections = (nextPageParams?:
        HyperScanNftCollectionsNextPageParams
    ) => {
        return useQuery({
            queryKey: [QueryKeys.HYPER_EVM_NFTS_COLLECTIONS, address, nextPageParams],
            queryFn: () => fetchHyperEvmNftsCollection(address as string, nextPageParams),
            staleTime: 60 * 1000 * 10, // 30 seconds
        });
    };

    const useNFTs = (nextPageParams?:
        HyperScanNftNextPageParams
    ) => {
        return useQuery({
            queryKey: [QueryKeys.HYPER_EVM_NFTS, address, nextPageParams],
            queryFn: () => fetchHyperEvmNfts(address as string, nextPageParams),
            staleTime: 60 * 1000 * 10, // 10 minutes
        })
    };

    const useTransactions = () => {
        return useQuery({
            queryKey: [QueryKeys.HYPER_EVM_TRANSACTIONS, address],
            queryFn: () => fetchHyperEvmTransactions(address as string),
            staleTime: 60 * 1000 * 10, // 10 minutes
        })
    };

    const useNftInstances = (tokenAddress: string, nextPageParams?: HyperScanNftInstancesNextPageParams, enabled: boolean = true) => {
        return useQuery({
            queryKey: [QueryKeys.HYPER_EVM_NFT_INSTANCES, tokenAddress, address, nextPageParams],
            queryFn: () => fetchHyperEvmNftInstances(tokenAddress, address as string, nextPageParams),
            staleTime: 60 * 1000 * 5, // 5 minutes
            enabled: !!address && !!tokenAddress && enabled,
        });
    };

    const useTokenTransfers = (filter: "from" | "to" | "both", nextPageParams?: HyperScanTokenTransfersNextPageParams, enabled: boolean = true) => {
        return useQuery({
            queryKey: [QueryKeys.HYPER_EVM_TOKEN_TRANSFERS, address, filter, nextPageParams],
            queryFn: () => fetchHyperEvmTokenTransfers(address as string, filter, nextPageParams),
            staleTime: 60 * 1000 * 5, // 5 minutes
            enabled: !!address && enabled,
        });
    };

    return {
        useNFTsCollections,
        useNFTs,
        useTransactions,
        useNftInstances,
        useTokenTransfers,
    };
};

export default useHyperscan;

