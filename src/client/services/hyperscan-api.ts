import { HyperScanNftCollectionsResponse, HyperScanNftNextPageParams, HyperScanNFTResponse, HyperScanNftCollectionsNextPageParams, HyperScanNftInstancesResponse, HyperScanNftInstancesNextPageParams, HyperScanTokenTransfersResponse, HyperScanTokenTransfersNextPageParams } from "@/client/types/hyperscan-api";
import { ENDPOINTS } from "./endpoints";

// https://hyperscan.com
export const fetchHyperEvmERC20Tokens = async (address: string) => {
    const response = await fetch(
        `${ENDPOINTS.HYPEREVM_MAINNET}/addresses/${address}/tokens?type=ERC-20`
    );

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};


export const fetchHyperEvmNfts = async (address: string, nextPageParams?: HyperScanNftNextPageParams): Promise<HyperScanNFTResponse> => {
    let nextPageParamsString = '';
    if (nextPageParams) {
        nextPageParamsString = `items_count=${nextPageParams?.items_count}&token_contract_address_hash=${nextPageParams?.token_contract_address_hash}&token_id=${nextPageParams?.token_id}&token_type=${nextPageParams?.token_type}`;
    }
    const response = await fetch(
        `${ENDPOINTS.HYPEREVM_MAINNET}/addresses/${address}/nft?${nextPageParamsString}`
    );

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};

export const fetchHyperEvmNftsCollection = async (address: string, nextPageParams?: HyperScanNftCollectionsNextPageParams): Promise<HyperScanNftCollectionsResponse> => {
    let nextPageParamsString = '';
    if (nextPageParams) {
        nextPageParamsString = `token_contract_address_hash=${nextPageParams?.token_contract_address_hash}&token_type=${nextPageParams?.token_type}`;
    }
    const response = await fetch(
        `${ENDPOINTS.HYPEREVM_MAINNET}/addresses/${address}/nft/collections?${nextPageParamsString}`
    );

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};

export const fetchHyperEvmTransactions = async (address: string) => {
    // Calculate timestamp for 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000); // Convert to Unix timestamp
    const toTimestamp = Math.floor(Date.now() / 1000); // Current timestamp

    const response = await fetch(
        `${ENDPOINTS.HYPEREVM_MAINNET}/addresses/${address}/transactions?filter=${toTimestamp} | ${fromTimestamp}`
    );

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};

export const fetchHyperEvmNftInstances = async (tokenAddress: string, holderAddress: string, nextPageParams?: HyperScanNftInstancesNextPageParams): Promise<HyperScanNftInstancesResponse> => {
    let nextPageParamsString = '';
    if (nextPageParams) {
        nextPageParamsString = `&holder_address_hash=${nextPageParams.holder_address_hash}&unique_token=${nextPageParams.unique_token}`;
    }

    const response = await fetch(
        `${ENDPOINTS.HYPEREVM_MAINNET}/tokens/${tokenAddress}/instances?holder_address_hash=${holderAddress}${nextPageParamsString}`
    );

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};

export const fetchHyperEvmTokenTransfers = async (address: string, filter: "from" | "to" | "both", nextPageParams?: HyperScanTokenTransfersNextPageParams): Promise<HyperScanTokenTransfersResponse> => {
    let nextPageParamsString = '';
    if (nextPageParams) {
        nextPageParamsString = `&block_number=${nextPageParams.block_number}&index=${nextPageParams.index}`;
    }

    const response = await fetch(
        `${ENDPOINTS.HYPEREVM_MAINNET}/addresses/${address}/token-transfers?filter=${filter}${nextPageParamsString}`
    );

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};