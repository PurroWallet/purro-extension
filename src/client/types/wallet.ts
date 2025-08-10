export type ChainType = "hyperevm" | "ethereum" | "base" | "arbitrum" | "hyperevm-testnet";

export type SupportedChain = {
    name: string;
    symbol: string;
    chainId: number;
    chainIdHex?: string;
    icon: string;
    storageKey: ChainType;
    rpcUrls?: string[];
    blockExplorerUrls?: string[];
};

export interface ConnectionRequest {
    origin: string;
    favicon?: string;
    timestamp: number;
}

export interface TokenMetadata {
    name: string;
    symbol: string;
    decimals: number;
    logo?: string;
}

export interface TokenMetadataCache {
    [chainId: string]: {
        [contractAddress: string]: {
            metadata: TokenMetadata;
            cachedAt: number;
            expiresAt: number;
        }
    }
}


