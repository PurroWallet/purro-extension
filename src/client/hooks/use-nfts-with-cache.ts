import { useQuery } from "@tanstack/react-query";
import { HyperScanNftCollectionsNextPageParams } from "../types/hyperscan-api";
import useNFTStore from "./use-nft-store";
import useWalletStore from "./use-wallet-store";
import { fetchHyperEvmNftsCollection } from "@/client/services/hyperscan-api";
import QueryKeys from "../utils/query-keys";

const useNFTsWithCache = (
    page: number,
    pageParams: HyperScanNftCollectionsNextPageParams | undefined
) => {
    const { getActiveAccountWalletObject } = useWalletStore();
    const activeAccount = getActiveAccountWalletObject();
    const { getNFTData, setNFTData, isDataFresh } = useNFTStore();
    const address = activeAccount?.eip155?.address;

    return useQuery({
        queryKey: [QueryKeys.HYPER_EVM_NFTS_COLLECTIONS, address, page, pageParams],
        queryFn: async () => {
            if (!address) throw new Error("No active address");

            const result = await fetchHyperEvmNftsCollection(address, pageParams);

            // Cache the result
            setNFTData(address, page, pageParams, result);

            return result;
        },
        initialData: () => {
            if (!address) return undefined;

            // Try to get cached data
            const cachedData = getNFTData(address, page, pageParams);

            // Return cached data if it's fresh (within 5 minutes)
            if (cachedData && isDataFresh(cachedData.timestamp)) {
                return cachedData.data;
            }

            return undefined;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
        enabled: !!address,
    });
};

export default useNFTsWithCache; 