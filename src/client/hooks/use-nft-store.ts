import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HyperScanNftCollectionsResponse, HyperScanNftCollectionsNextPageParams, HyperScanNftInstancesResponse, HyperScanNftInstancesNextPageParams } from '@/client/types/hyperscan-api';

interface NFTCacheData {
    data: HyperScanNftCollectionsResponse;
    timestamp: number;
    address: string;
}

interface NFTInstancesCacheData {
    data: HyperScanNftInstancesResponse;
    timestamp: number;
    tokenAddress: string;
    holderAddress: string;
}

interface NFTPageCache {
    [pageKey: string]: NFTCacheData;
}

interface NFTInstancesPageCache {
    [pageKey: string]: NFTInstancesCacheData;
}

interface NFTInstancesCache {
    [tokenHolderKey: string]: NFTInstancesPageCache;
}

interface NFTStore {
    // Cache data by address
    nftCache: Record<string, NFTPageCache>;

    // Cache NFT instances by token address + holder address
    nftInstancesCache: NFTInstancesCache;

    // Actions for NFT Collections
    setNFTData: (
        address: string,
        page: number,
        pageParams: HyperScanNftCollectionsNextPageParams | undefined,
        data: HyperScanNftCollectionsResponse
    ) => void;

    getNFTData: (
        address: string,
        page: number,
        pageParams: HyperScanNftCollectionsNextPageParams | undefined
    ) => NFTCacheData | null;

    clearNFTCache: (address?: string) => void;

    // Actions for NFT Instances
    setNFTInstancesData: (
        tokenAddress: string,
        holderAddress: string,
        page: number,
        pageParams: HyperScanNftInstancesNextPageParams | undefined,
        data: HyperScanNftInstancesResponse
    ) => void;

    getNFTInstancesData: (
        tokenAddress: string,
        holderAddress: string,
        page: number,
        pageParams: HyperScanNftInstancesNextPageParams | undefined
    ) => NFTInstancesCacheData | null;

    clearNFTInstancesCache: (tokenAddress?: string) => void;

    // Utility
    isDataFresh: (timestamp: number, maxAge?: number) => boolean;
}

// Helper function to create cache key for collections
const createCollectionCacheKey = (page: number, pageParams: HyperScanNftCollectionsNextPageParams | undefined): string => {
    if (!pageParams) return `page-${page}`;
    return `page-${page}-${pageParams.token_contract_address_hash}-${pageParams.token_type}`;
};

// Helper function to create cache key for instances
const createInstancesCacheKey = (tokenAddress: string, holderAddress: string): string => {
    return `instances-${tokenAddress}-${holderAddress}`;
};

// Helper function to create cache key for instance pages
const createInstancesPageCacheKey = (page: number, pageParams: HyperScanNftInstancesNextPageParams | undefined): string => {
    if (!pageParams) return `page-${page}`;
    return `page-${page}-${pageParams.holder_address_hash}-${pageParams.unique_token}`;
};

const useNFTStore = create<NFTStore>()(
    persist(
        (set, get) => ({
            nftCache: {},
            nftInstancesCache: {},

            // NFT Collections actions
            setNFTData: (address, page, pageParams, data) => {
                const cacheKey = createCollectionCacheKey(page, pageParams);
                set((state) => ({
                    nftCache: {
                        ...state.nftCache,
                        [address]: {
                            ...state.nftCache[address],
                            [cacheKey]: {
                                data,
                                timestamp: Date.now(),
                                address,
                            },
                        },
                    },
                }));
            },

            getNFTData: (address, page, pageParams) => {
                const cacheKey = createCollectionCacheKey(page, pageParams);
                const addressCache = get().nftCache[address];
                return addressCache?.[cacheKey] || null;
            },

            clearNFTCache: (address) => {
                if (address) {
                    set((state) => {
                        const newCache = { ...state.nftCache };
                        delete newCache[address];
                        return { nftCache: newCache };
                    });
                } else {
                    set({ nftCache: {} });
                }
            },

            // NFT Instances actions
            setNFTInstancesData: (tokenAddress, holderAddress, page, pageParams, data) => {
                const tokenHolderKey = createInstancesCacheKey(tokenAddress, holderAddress);
                const pageKey = createInstancesPageCacheKey(page, pageParams);
                set((state) => ({
                    nftInstancesCache: {
                        ...state.nftInstancesCache,
                        [tokenHolderKey]: {
                            ...state.nftInstancesCache[tokenHolderKey],
                            [pageKey]: {
                                data,
                                timestamp: Date.now(),
                                tokenAddress,
                                holderAddress,
                            },
                        },
                    },
                }));
            },

            getNFTInstancesData: (tokenAddress, holderAddress, page, pageParams) => {
                const tokenHolderKey = createInstancesCacheKey(tokenAddress, holderAddress);
                const pageKey = createInstancesPageCacheKey(page, pageParams);
                const tokenHolderCache = get().nftInstancesCache[tokenHolderKey];
                return tokenHolderCache?.[pageKey] || null;
            },

            clearNFTInstancesCache: (tokenAddress) => {
                if (tokenAddress) {
                    set((state) => {
                        const newCache = { ...state.nftInstancesCache };
                        // Clear all instances for this token
                        Object.keys(newCache).forEach(key => {
                            if (key.startsWith(`instances-${tokenAddress}-`)) {
                                delete newCache[key];
                            }
                        });
                        return { nftInstancesCache: newCache };
                    });
                } else {
                    set({ nftInstancesCache: {} });
                }
            },

            // Utility
            isDataFresh: (timestamp, maxAge = 5 * 60 * 1000) => { // Default 5 minutes
                return Date.now() - timestamp < maxAge;
            },
        }),
        {
            name: 'nft-cache-storage',
            // Persist both caches
            partialize: (state) => ({
                nftCache: state.nftCache,
                nftInstancesCache: state.nftInstancesCache
            }),
        }
    )
);

export default useNFTStore; 