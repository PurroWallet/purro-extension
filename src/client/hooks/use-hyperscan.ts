import { useQuery } from '@tanstack/react-query';
import {
  fetchHyperEvmNfts,
  fetchHyperEvmNftsCollection,
  fetchHyperEvmTransactions,
  fetchHyperEvmNftInstances,
  fetchHyperEvmTokenTransfers,
} from '../services/hyperscan-api';
import {
  HyperScanNftNextPageParams,
  HyperScanNftCollectionsNextPageParams,
  HyperScanNftInstancesNextPageParams,
  HyperScanTokenTransfersNextPageParams,
} from '../types/hyperscan-api';
import QueryKeys from '../utils/query-keys';
import useWalletStore from './use-wallet-store';
import useDevModeStore from './use-dev-mode';

// Constants for easy customization
const ADDRESS_VALIDATION_REGEX = /^0x[a-fA-F0-9]{40}$/;

const useHyperscan = () => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const { isDevMode } = useDevModeStore();
  const activeAccount = getActiveAccountWalletObject();
  const address = activeAccount?.eip155?.address;

  // Helper function to validate address
  const isValidAddress = (addr: string | undefined): boolean => {
    return !!addr && ADDRESS_VALIDATION_REGEX.test(addr);
  };

  const useNFTsCollections = (
    nextPageParams?: HyperScanNftCollectionsNextPageParams
  ) => {
    return useQuery({
      queryKey: [QueryKeys.HYPER_EVM_NFTS_COLLECTIONS, address, nextPageParams],
      queryFn: () =>
        fetchHyperEvmNftsCollection(address as string, isDevMode, nextPageParams),
      staleTime: 60 * 1000 * 10, // 10 minutes
      enabled: isValidAddress(address),
    });
  };

  const useNFTs = (nextPageParams?: HyperScanNftNextPageParams) => {
    return useQuery({
      queryKey: [QueryKeys.HYPER_EVM_NFTS, address, nextPageParams],
      queryFn: () => fetchHyperEvmNfts(address as string, isDevMode, nextPageParams),
      staleTime: 60 * 1000 * 10, // 10 minutes
      enabled: isValidAddress(address),
    });
  };

  const useTransactions = () => {
    return useQuery({
      queryKey: [QueryKeys.HYPER_EVM_TRANSACTIONS, address],
      queryFn: () => fetchHyperEvmTransactions(address as string),
      staleTime: 60 * 1000 * 10, // 10 minutes
      enabled: isValidAddress(address),
    });
  };

  const useNftInstances = (
    tokenAddress: string,
    nextPageParams?: HyperScanNftInstancesNextPageParams,
    enabled: boolean = true
  ) => {
    return useQuery({
      queryKey: [
        QueryKeys.HYPER_EVM_NFT_INSTANCES,
        tokenAddress,
        address,
        nextPageParams,
      ],
      queryFn: () =>
        fetchHyperEvmNftInstances(
          tokenAddress,
          address as string,
          isDevMode,
          nextPageParams
        ),
      staleTime: 60 * 1000 * 5, // 5 minutes
      enabled: isValidAddress(address) && !!tokenAddress && enabled,
    });
  };

  const useTokenTransfers = (
    filter: 'from' | 'to' | 'both',
    nextPageParams?: HyperScanTokenTransfersNextPageParams,
    enabled: boolean = true
  ) => {
    return useQuery({
      queryKey: [
        QueryKeys.HYPER_EVM_TOKEN_TRANSFERS,
        address,
        filter,
        nextPageParams,
      ],
      queryFn: () =>
        fetchHyperEvmTokenTransfers(address as string, filter, isDevMode, nextPageParams),
      staleTime: 60 * 1000 * 5, // 5 minutes
      enabled: isValidAddress(address) && enabled,
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
