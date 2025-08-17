import { ethers } from 'ethers';

// Cache để tránh gọi contract nhiều lần cho cùng 1 token
const decimalsCache = new Map<string, number>();

// ERC-20 ABI chỉ cần hàm decimals
const ERC20_DECIMALS_ABI = ['function decimals() view returns (uint8)'];

// RPC URLs cho các chains
const getRpcUrl = (chain: string): string => {
  switch (chain) {
    case 'ethereum':
      return 'https://eth.llamarpc.com';
    case 'arbitrum':
      return 'https://arb1.arbitrum.io/rpc';
    case 'base':
      return 'https://mainnet.base.org';
    case 'polygon':
      return 'https://polygon-rpc.com';
    case 'optimism':
      return 'https://mainnet.optimism.io';
    case 'bsc':
      return 'https://bsc-dataseed.binance.org';
    case 'hyperevm':
      return 'https://api.hyperliquid-testnet.xyz/evm';
    default:
      return 'https://eth.llamarpc.com';
  }
};

/**
 * Fetch decimals từ contract ERC-20
 * @param contractAddress - Địa chỉ contract token
 * @param chain - Chain name (ethereum, arbitrum, base, etc.)
 * @returns Promise<number> - Số decimals của token
 */
export const fetchTokenDecimals = async (
  contractAddress: string,
  chain: string
): Promise<number> => {
  try {
    // Tạo cache key
    const cacheKey = `${chain}:${contractAddress.toLowerCase()}`;

    // Kiểm tra cache trước
    if (decimalsCache.has(cacheKey)) {
      return decimalsCache.get(cacheKey)!;
    }


    // Tạo provider cho chain
    const rpcUrl = getRpcUrl(chain);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Tạo contract instance
    const contract = new ethers.Contract(
      contractAddress,
      ERC20_DECIMALS_ABI,
      provider
    );

    // Gọi decimals() với timeout
    const decimalsPromise = contract.decimals();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const decimals = (await Promise.race([
      decimalsPromise,
      timeoutPromise,
    ])) as bigint;
    const decimalsNumber = Number(decimals);

    // Validate decimals (thường từ 0-18, có thể lên 24)
    if (decimalsNumber < 0 || decimalsNumber > 30) {
      throw new Error(`Invalid decimals value: ${decimalsNumber}`);
    }

    // Lưu vào cache
    decimalsCache.set(cacheKey, decimalsNumber);

    return decimalsNumber;
  } catch (error) {
    console.warn(`❌ Failed to fetch decimals for ${contractAddress}:`, error);

    // Fallback về 18 (most common)
    const fallbackDecimals = 18;
    return fallbackDecimals;
  }
};

/**
 * Validate và ensure token có decimals
 * @param token - Token object
 * @returns Promise<number> - Decimals đã được validate
 */
export const ensureTokenDecimals = async (token: any): Promise<number> => {
  // Nếu đã có decimals và hợp lệ, return luôn
  if (
    token.decimals &&
    typeof token.decimals === 'number' &&
    token.decimals > 0
  ) {
    return token.decimals;
  }

  // Nếu là native token, return 18
  if (
    token.symbol === 'ETH' ||
    token.symbol === 'HYPE' ||
    token.contractAddress === 'native' ||
    token.contractAddress === 'NATIVE' ||
    token.isNative
  ) {
    return 18;
  }

  // Fetch decimals từ contract
  if (token.contractAddress && token.chain) {
    const decimals = await fetchTokenDecimals(
      token.contractAddress,
      token.chain
    );

    // Update token object nếu có thể
    if (token && typeof token === 'object') {
      token.decimals = decimals;
    }

    return decimals;
  }

  // Fallback cuối cùng
  console.warn('⚠️ Could not determine token decimals, using fallback 18');
  return 18;
};

/**
 * Clear decimals cache (useful for testing)
 */
export const clearDecimalsCache = (): void => {
  decimalsCache.clear();
};

/**
 * Get cache size (for debugging)
 */
export const getDecimalsCacheSize = (): number => {
  return decimalsCache.size;
};
