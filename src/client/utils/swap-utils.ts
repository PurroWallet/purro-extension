import { UnifiedToken } from '@/client/components/token-list';
import { SwapRouteV2Response } from '@/client/types/liquidswap-api';

// Constants for HYPE/WHYPE detection
export const HYPE_NATIVE_IDENTIFIERS = ['HYPE', 'native', 'NATIVE'];
export const WHYPE_TOKEN_ADDRESS = '0x5555555555555555555555555555555555555555';
export const HYPE_DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

// Gas estimation constants
export const GAS_ESTIMATION_CONSTANTS = {
  NATIVE_TRANSFER_GAS: 21000,
  ERC20_TRANSFER_GAS: 65000,
  SWAP_GAS_ESTIMATE: 150000,
  DEFAULT_GAS_PRICE: 20e9, // 20 Gwei
  GAS_BUFFER_PERCENTAGE: 0.1, // 10% buffer
  NATIVE_GAS_RESERVE: 0.001, // Reserve 0.001 ETH/HYPE for gas
  MIN_NATIVE_BALANCE_AFTER_GAS: 0.0001, // Minimum balance to keep after gas
};

// Gas estimate interface
export interface GasEstimate {
  gasLimit: number;
  gasPrice: number; // in wei
  gasCostEth: number;
  gasCostUsd: number;
  estimationType: 'actual' | 'fallback';
}

// Max balance options
export interface MaxBalanceOptions {
  reserveGas?: boolean;
  gasBuffer?: number; // percentage (0.1 = 10%)
  customGasEstimate?: GasEstimate;
  minReserve?: number; // minimum amount to reserve
}

// Helper functions for swap logic
export const isHypeToken = (token: UnifiedToken | null): boolean => {
  if (!token) return false;
  return (
    token.isNative ||
    HYPE_NATIVE_IDENTIFIERS.includes(token.symbol) ||
    HYPE_NATIVE_IDENTIFIERS.includes(token.contractAddress) ||
    token.contractAddress === 'native' ||
    token.contractAddress === 'NATIVE' ||
    token.contractAddress === HYPE_DEAD_ADDRESS
  );
};

export const isWhypeToken = (token: UnifiedToken | null): boolean => {
  if (!token) return false;
  return (
    token.symbol === 'WHYPE' ||
    token.contractAddress?.toLowerCase() === WHYPE_TOKEN_ADDRESS.toLowerCase()
  );
};

export const getTokenBalance = (token: UnifiedToken | null): number => {
  if (!token?.balance) return 0;
  try {
    let balanceValue;
    if (typeof token.balance === 'string' && token.balance.startsWith('0x')) {
      balanceValue = BigInt(token.balance);
    } else {
      balanceValue = BigInt(token.balance || '0');
    }

    const decimals = token.decimals || 18;
    const divisor = BigInt(10) ** BigInt(decimals);

    const wholePart = balanceValue / divisor;
    const fractionalPart = balanceValue % divisor;

    return Number(wholePart) + Number(fractionalPart) / Math.pow(10, decimals);
  } catch (error) {
    console.warn('Error parsing token balance:', error, token);
    return 0;
  }
};

export const isWrapScenario = (
  tokenIn: UnifiedToken | null,
  tokenOut: UnifiedToken | null
): boolean => {
  return isHypeToken(tokenIn) && isWhypeToken(tokenOut);
};

export const isUnwrapScenario = (
  tokenIn: UnifiedToken | null,
  tokenOut: UnifiedToken | null
): boolean => {
  return isWhypeToken(tokenIn) && isHypeToken(tokenOut);
};

export const getActionButtonText = (
  tokenIn: UnifiedToken | null,
  tokenOut: UnifiedToken | null
): string => {
  if (isWrapScenario(tokenIn, tokenOut)) {
    return 'Wrap';
  } else if (isUnwrapScenario(tokenIn, tokenOut)) {
    return 'Unwrap';
  } else {
    return 'Swap';
  }
};

export const validateSwap = (
  tokenIn: UnifiedToken | null,
  tokenOut: UnifiedToken | null,
  amountIn: string,
  amountOut: string,
  hasInsufficientBalance: boolean,
  routeError: Error | null,
  route: SwapRouteV2Response | null
): boolean => {
  return !!(
    tokenIn &&
    tokenOut &&
    amountIn &&
    amountOut &&
    !hasInsufficientBalance &&
    !routeError &&
    route
  );
};

/**
 * Enhanced max balance calculation that considers gas fees for native tokens
 */
export const getMaxSpendableBalance = (
  token: UnifiedToken | null,
  options: MaxBalanceOptions = {}
): string => {
  if (!token?.balance) return '0';

  const {
    reserveGas = true,
    gasBuffer = GAS_ESTIMATION_CONSTANTS.GAS_BUFFER_PERCENTAGE,
    customGasEstimate,
    minReserve = GAS_ESTIMATION_CONSTANTS.MIN_NATIVE_BALANCE_AFTER_GAS,
  } = options;

  try {
    // Parse token balance
    let balanceValue: bigint;
    if (typeof token.balance === 'string' && token.balance.startsWith('0x')) {
      balanceValue = BigInt(token.balance);
    } else {
      balanceValue = BigInt(token.balance || '0');
    }

    const decimals = token.decimals || 18;
    const balanceEth = Number(balanceValue) / Math.pow(10, decimals);

    // For non-native tokens, return full balance
    if (!isHypeToken(token)) {
      return formatMaxBalance(balanceEth, decimals);
    }

    // For native tokens, consider gas fees if requested
    if (!reserveGas) {
      return formatMaxBalance(balanceEth, decimals);
    }

    let gasReserve = GAS_ESTIMATION_CONSTANTS.NATIVE_GAS_RESERVE;

    // Use custom gas estimate if provided
    if (customGasEstimate) {
      const gasBufferMultiplier = 1 + gasBuffer;
      gasReserve = customGasEstimate.gasCostEth * gasBufferMultiplier;
    } else {
      // Use default gas reserve with buffer
      gasReserve *= 1 + gasBuffer;
    }

    // Ensure minimum reserve
    gasReserve = Math.max(gasReserve, minReserve);

    // Calculate max spendable amount
    const maxSpendable = Math.max(0, balanceEth - gasReserve);

    return formatMaxBalance(maxSpendable, decimals);
  } catch (error) {
    console.warn('Error calculating max spendable balance:', error, token);
    return '0';
  }
};

/**
 * Format max balance with appropriate precision
 */
export const formatMaxBalance = (
  balance: number,
  decimals: number = 18
): string => {
  if (balance === 0) return '0';

  // Limit display decimals for better UX
  const maxDisplayDecimals = Math.min(decimals, 8);

  // For very small amounts, show more precision
  if (balance < 0.0001) {
    return balance.toFixed(maxDisplayDecimals).replace(/\.?0+$/, '');
  }

  // For normal amounts, show reasonable precision
  const precision = balance < 1 ? 6 : balance < 1000 ? 4 : 2;
  return balance
    .toFixed(Math.min(precision, maxDisplayDecimals))
    .replace(/\.?0+$/, '');
};

/**
 * Estimate gas cost for a transaction
 */
export const estimateGasCost = (
  token: UnifiedToken | null,
  transactionType: 'transfer' | 'swap' = 'transfer'
): GasEstimate => {
  if (!token) {
    return {
      gasLimit: GAS_ESTIMATION_CONSTANTS.NATIVE_TRANSFER_GAS,
      gasPrice: GAS_ESTIMATION_CONSTANTS.DEFAULT_GAS_PRICE,
      gasCostEth:
        (GAS_ESTIMATION_CONSTANTS.NATIVE_TRANSFER_GAS *
          GAS_ESTIMATION_CONSTANTS.DEFAULT_GAS_PRICE) /
        1e18,
      gasCostUsd: 0,
      estimationType: 'fallback',
    };
  }

  const isNative = isHypeToken(token);
  let gasLimit: number;

  switch (transactionType) {
    case 'swap':
      gasLimit = GAS_ESTIMATION_CONSTANTS.SWAP_GAS_ESTIMATE;
      break;
    case 'transfer':
    default:
      gasLimit = isNative
        ? GAS_ESTIMATION_CONSTANTS.NATIVE_TRANSFER_GAS
        : GAS_ESTIMATION_CONSTANTS.ERC20_TRANSFER_GAS;
      break;
  }

  const gasPrice = GAS_ESTIMATION_CONSTANTS.DEFAULT_GAS_PRICE;
  const gasCostEth = (gasLimit * gasPrice) / 1e18;
  const tokenPrice = token.usdPrice || 3000; // Fallback price
  const gasCostUsd = gasCostEth * tokenPrice;

  return {
    gasLimit,
    gasPrice,
    gasCostEth,
    gasCostUsd,
    estimationType: 'fallback',
  };
};

/**
 * Check if user has enough balance for transaction including gas
 */
export const hasEnoughBalanceWithGas = (
  token: UnifiedToken | null,
  amount: string,
  gasEstimate?: GasEstimate
): { hasEnough: boolean; shortfall: number; details: string } => {
  if (!token || !amount) {
    return {
      hasEnough: false,
      shortfall: 0,
      details: 'Invalid token or amount',
    };
  }

  const balance = getTokenBalance(token);
  const requestedAmount = parseFloat(amount);

  // For non-native tokens, only check token balance
  if (!isHypeToken(token)) {
    const hasEnough = balance >= requestedAmount;
    return {
      hasEnough,
      shortfall: hasEnough ? 0 : requestedAmount - balance,
      details: hasEnough ? 'Sufficient balance' : 'Insufficient token balance',
    };
  }

  // For native tokens, consider gas fees
  const gasCost =
    gasEstimate?.gasCostEth || GAS_ESTIMATION_CONSTANTS.NATIVE_GAS_RESERVE;
  const totalNeeded = requestedAmount + gasCost;
  const hasEnough = balance >= totalNeeded;

  return {
    hasEnough,
    shortfall: hasEnough ? 0 : totalNeeded - balance,
    details: hasEnough
      ? 'Sufficient balance including gas'
      : `Need ${(totalNeeded - balance).toFixed(6)} more (including ${gasCost.toFixed(6)} for gas)`,
  };
};
