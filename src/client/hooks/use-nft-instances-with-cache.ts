import { useQuery } from '@tanstack/react-query';
import { HyperScanNftInstancesNextPageParams } from '../types/hyperscan-api';
import useNFTStore from './use-nft-store';
import useWalletStore from './use-wallet-store';
import useDevModeStore from './use-dev-mode';
import { fetchHyperEvmNftInstances } from '@/client/services/hyperscan-api';
import QueryKeys from '../utils/query-keys';

const useNFTInstancesWithCache = (
  tokenAddress: string,
  page: number = 1,
  pageParams: HyperScanNftInstancesNextPageParams | undefined = undefined,
  enabled: boolean = true
) => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const { isDevMode } = useDevModeStore();
  const activeAccount = getActiveAccountWalletObject();
  const { getNFTInstancesData, setNFTInstancesData, isDataFresh } =
    useNFTStore();
  const holderAddress = activeAccount?.eip155?.address;

  return useQuery({
    queryKey: [
      QueryKeys.HYPER_EVM_NFT_INSTANCES,
      tokenAddress,
      holderAddress,
      page,
      pageParams,
    ],
    queryFn: async () => {
      if (!holderAddress) throw new Error('No active holder address');

      const result = await fetchHyperEvmNftInstances(
        tokenAddress,
        holderAddress,
        isDevMode,
        pageParams
      );

      // Cache the result
      setNFTInstancesData(
        tokenAddress,
        holderAddress,
        page,
        pageParams,
        result
      );

      return result;
    },
    initialData: () => {
      if (!holderAddress) return undefined;

      // Try to get cached data
      const cachedData = getNFTInstancesData(
        tokenAddress,
        holderAddress,
        page,
        pageParams
      );

      // Return cached data if it's fresh (within 5 minutes)
      if (cachedData && isDataFresh(cachedData.timestamp)) {
        return cachedData.data;
      }

      return undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!holderAddress && !!tokenAddress && enabled,
  });
};

export default useNFTInstancesWithCache;
