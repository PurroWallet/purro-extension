import {
  HyperScanNftCollectionsResponse,
  HyperScanNftNextPageParams,
  HyperScanNFTResponse,
  HyperScanNftCollectionsNextPageParams,
  HyperScanNftInstancesResponse,
  HyperScanNftInstancesNextPageParams,
  HyperScanTokenTransfersResponse,
  HyperScanTokenTransfersNextPageParams,
} from "@/client/types/hyperscan-api";
import { ENDPOINTS, ENDPOINTS_TESTNET } from "./endpoints";

// Constants for easy customization
const ADDRESS_VALIDATION_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Helper function to validate address
const isValidAddress = (address: string): boolean => {
  return !!address && ADDRESS_VALIDATION_REGEX.test(address);
};

// https://hyperscan.com
export const fetchHyperEvmERC20Tokens = async (
  address: string,
  isDevMode: boolean
) => {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  const endpoint = isDevMode ? ENDPOINTS_TESTNET : ENDPOINTS;

  const response = await fetch(
    `${endpoint.HYPEREVM_MAINNET}/addresses/${address}/tokens?type=ERC-20`
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchHyperEvmNfts = async (
  address: string,
  isDevMode: boolean,
  nextPageParams?: HyperScanNftNextPageParams
): Promise<HyperScanNFTResponse> => {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  let nextPageParamsString = "";
  if (nextPageParams) {
    nextPageParamsString = `items_count=${nextPageParams?.items_count}&token_contract_address_hash=${nextPageParams?.token_contract_address_hash}&token_id=${nextPageParams?.token_id}&token_type=${nextPageParams?.token_type}`;
  }

  const endpoint = isDevMode ? ENDPOINTS_TESTNET : ENDPOINTS;
  const response = await fetch(
    `${endpoint.HYPEREVM_MAINNET}/addresses/${address}/nft?${nextPageParamsString}`
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchHyperEvmNftsCollection = async (
  address: string,
  isDevMode: boolean = false,
  nextPageParams?: HyperScanNftCollectionsNextPageParams
): Promise<HyperScanNftCollectionsResponse> => {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  let nextPageParamsString = "";
  if (nextPageParams) {
    nextPageParamsString = `token_contract_address_hash=${nextPageParams?.token_contract_address_hash}&token_type=${nextPageParams?.token_type}`;
  }

  const endpoint = isDevMode ? ENDPOINTS_TESTNET : ENDPOINTS;
  const response = await fetch(
    `${endpoint.HYPEREVM_MAINNET}/addresses/${address}/nft/collections?${nextPageParamsString}`
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchHyperEvmTransactions = async (
  address: string,
  isDevMode: boolean = false
) => {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  // Calculate timestamp for 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000); // Convert to Unix timestamp
  const toTimestamp = Math.floor(Date.now() / 1000); // Current timestamp

  const endpoint = isDevMode ? ENDPOINTS_TESTNET : ENDPOINTS;
  const response = await fetch(
    `${endpoint.HYPEREVM_MAINNET}/addresses/${address}/transactions?filter=${toTimestamp} | ${fromTimestamp}`
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchHyperEvmNftInstances = async (
  tokenAddress: string,
  holderAddress: string,
  isDevMode: boolean = false,
  nextPageParams?: HyperScanNftInstancesNextPageParams
): Promise<HyperScanNftInstancesResponse> => {
  if (!isValidAddress(tokenAddress)) {
    throw new Error(`Invalid token address format: ${tokenAddress}`);
  }
  if (!isValidAddress(holderAddress)) {
    throw new Error(`Invalid holder address format: ${holderAddress}`);
  }

  let nextPageParamsString = "";
  if (nextPageParams) {
    nextPageParamsString = `&holder_address_hash=${nextPageParams.holder_address_hash}&unique_token=${nextPageParams.unique_token}`;
  }

  const endpoint = isDevMode ? ENDPOINTS_TESTNET : ENDPOINTS;
  const response = await fetch(
    `${endpoint.HYPEREVM_MAINNET}/tokens/${tokenAddress}/instances?holder_address_hash=${holderAddress}${nextPageParamsString}`
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchHyperEvmTokenTransfers = async (
  address: string,
  filter: "from" | "to" | "both",
  isDevMode: boolean = false,
  nextPageParams?: HyperScanTokenTransfersNextPageParams
): Promise<HyperScanTokenTransfersResponse> => {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }

  let nextPageParamsString = "";
  if (nextPageParams) {
    nextPageParamsString = `&block_number=${nextPageParams.block_number}&index=${nextPageParams.index}`;
  }

  const endpoint = isDevMode ? ENDPOINTS_TESTNET : ENDPOINTS;
  const response = await fetch(
    `${endpoint.HYPEREVM_MAINNET}/addresses/${address}/token-transfers?filter=${filter}${nextPageParamsString}`
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};
