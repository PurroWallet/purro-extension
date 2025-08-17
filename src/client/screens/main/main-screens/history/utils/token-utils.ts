import { ENDPOINTS } from '@/client/services/endpoints';
import { fetchSingleTokenMetadataFast } from '@/client/services/alchemy-api';
import { fetchTokens } from '@/client/services/liquidswap-api';
import type { FetchTokenRequest } from '@/client/types/liquidswap-api';
import type { TokenInfo } from '../types';

// Get Alchemy endpoint for chain
export const getAlchemyEndpoint = (chainId: number): string => {
    switch (chainId) {
        case 1:
            return ENDPOINTS.ALCHEMY_ETH_MAINNET;
        case 42161:
            return ENDPOINTS.ALCHEMY_ARB_MAINNET;
        case 8453:
            return ENDPOINTS.ALCHEMY_BASE_MAINNET;
        default:
            return ENDPOINTS.ALCHEMY_ETH_MAINNET; // Default to Ethereum
    }
};

// Helper function to fetch token metadata for EVM chains using Alchemy
export const fetchEvmTokenMetadata = async (
    tokenAddress: string,
    chainId: number
): Promise<TokenInfo> => {
    try {
        const endpoint = getAlchemyEndpoint(chainId);
        const metadata = await fetchSingleTokenMetadataFast(endpoint, tokenAddress);

        return {
            address: tokenAddress,
            name: metadata.name || 'Unknown Token',
            symbol: metadata.symbol || 'UNKNOWN',
            decimals: metadata.decimals || 18,
            logo: metadata.logo,
        };
    } catch (error) {
        console.warn(
            `Failed to fetch EVM token metadata for ${tokenAddress}:`,
            error
        );
        return {
            address: tokenAddress,
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
            decimals: 18,
        };
    }
};

// Helper function to fetch token metadata for HyperEVM using LiquidSwap API
export const fetchHyperEvmTokenMetadata = async (
    tokenAddress: string
): Promise<TokenInfo> => {
    try {
        const request: FetchTokenRequest = {
            search: tokenAddress,
            limit: 1,
            metadata: true,
        };

        const response = await fetchTokens(request);

        if (response.success && response.data.tokens.length > 0) {
            const token = response.data.tokens[0];
            return {
                address: tokenAddress,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
            };
        }

        // Fallback if not found
        return {
            address: tokenAddress,
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
            decimals: 18,
        };
    } catch (error) {
        console.warn(
            `Failed to fetch HyperEVM token metadata for ${tokenAddress}:`,
            error
        );
        return {
            address: tokenAddress,
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
            decimals: 18,
        };
    }
};

// Main function to fetch token metadata based on chain
export const fetchTokenMetadata = async (
    tokenAddress: string,
    chainId: number
): Promise<TokenInfo> => {
    try {
        let result: TokenInfo;

        if (tokenAddress === '0x000000000000000000000000000000000000dEaD') {
            return {
                address: tokenAddress,
                symbol: 'HYPE',
                name: 'Native HYPE',
                decimals: 18,
                logo: undefined,
            };
        }

        // Check if it's HyperEVM
        if (chainId === 999) { // HyperEVM chain ID
            result = await fetchHyperEvmTokenMetadata(tokenAddress);
        } else {
            // Use Alchemy for other EVM chains
            result = await fetchEvmTokenMetadata(tokenAddress, chainId);
        }

        return result;
    } catch (error) {
        console.error('❌ Token metadata fetch failed:', tokenAddress, error);
        // Return a fallback token info
        return {
            address: tokenAddress,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: 18,
            logo: undefined,
        };
    }
}; 