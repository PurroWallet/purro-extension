import { sendMessage } from '@/client/utils/extension-message-utils';
import { UnifiedToken } from '@/client/components/token-list';
import { isHypeToken, isWrapScenario, isUnwrapScenario } from './swap-utils';
import { SwapRouteV2Response } from '@/client/types/liquidswap-api';
import { ethers } from 'ethers';

// Constants for easy customization
const SWAP_CONSTANTS = {
  HYPEREVM_CHAIN_ID: '0x3e7',
  WRAP_FUNCTION_SELECTOR: '0xd0e30db0',
  UNWRAP_FUNCTION_SELECTOR: '0x2e1a7d4d',
  ERROR_MESSAGES: {
    NO_SPENDER_ADDRESS: 'No spender address in route execution',
    TOKEN_APPROVAL_FAILED: 'Token approval failed',
    INSUFFICIENT_ALLOWANCE: 'Insufficient token allowance',
  },
  DEBUG: {
    ENABLED: false,
    LOG_TRANSACTION_DATA: false,
  },
} as const;

// Debug logging utility
const debugLog = (message: string, data?: any) => {
  if (SWAP_CONSTANTS.DEBUG.ENABLED) {
    if (data && SWAP_CONSTANTS.DEBUG.LOG_TRANSACTION_DATA) {
      console.log(message, data);
    } else if (!data) {
      console.log(message);
    }
  }
};

const debugError = (message: string, error?: any) => {
  // Prevent TypeScript unused parameter errors when logging is disabled
  void message;
  void error;
  if (SWAP_CONSTANTS.DEBUG.ENABLED) {
    // Intentionally disabled in production
  }
};

// Transaction data interface for better type safety
interface TransactionData {
  to: string;
  data: string;
  value: string;
  chainId?: string;
}

// Transaction result interface
interface TransactionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface SwapTransactionParams {
  tokenIn: UnifiedToken;
  tokenOut: UnifiedToken;
  amountIn: string;
  route: SwapRouteV2Response;
}

export interface SwapExecutionResult {
  success: boolean;
  data?: string;
  error?: string;
}

export const executeSwapTransaction = async ({
  tokenIn,
  tokenOut,
  amountIn,
  route,
}: {
  tokenIn: UnifiedToken;
  tokenOut: UnifiedToken;
  amountIn: string;
  route: SwapRouteV2Response;
}): Promise<SwapExecutionResult> => {
  debugLog('[Purro] 🔄 Starting swap transaction:', {
    tokenIn: { symbol: tokenIn.symbol, address: tokenIn.contractAddress },
    tokenOut: { symbol: tokenOut.symbol, address: tokenOut.contractAddress },
    amountIn,
    route: { to: route.execution?.to, hasCalldata: !!route.execution?.calldata }
  });

  try {
    // Determine if this is a direct wrap/unwrap scenario
    const isDirectWrapUnwrapScenario =
      isWrapScenario(tokenIn, tokenOut) || isUnwrapScenario(tokenIn, tokenOut);

    // Check if tokens are native (ETH, MATIC, etc.)
    const isFromNativeToken = isHypeToken(tokenIn);

    debugLog('[Purro] 📊 Transaction type analysis:', {
      isDirectWrapUnwrapScenario,
      isFromNativeToken,
      isWrap: isWrapScenario(tokenIn, tokenOut),
      isUnwrap: isUnwrapScenario(tokenIn, tokenOut)
    });

    // Step 1: Handle approval for ERC20 tokens (skip for direct wrap/unwrap)
    if (!isFromNativeToken && !isDirectWrapUnwrapScenario) {
      debugLog('[Purro] 🔒 Checking token allowance for ERC20 token...');

      const spenderAddress = route.execution?.to;
      if (!spenderAddress) {
        debugError('[Purro] ❌ No spender address found in route');
        throw new Error(SWAP_CONSTANTS.ERROR_MESSAGES.NO_SPENDER_ADDRESS);
      }

      debugLog('[Purro] 🔍 Spender address:', spenderAddress);

      // Check current allowance
      const allowanceData = {
        tokenAddress: tokenIn.contractAddress,
        spenderAddress: spenderAddress,
        chainId: SWAP_CONSTANTS.HYPEREVM_CHAIN_ID,
      };

      debugLog('[Purro] 📞 Calling EVM_CHECK_TOKEN_ALLOWANCE with:', allowanceData);

      const allowanceResult = await sendMessage(
        'EVM_CHECK_TOKEN_ALLOWANCE',
        allowanceData
      );

      debugLog('[Purro] 📋 Allowance result:', allowanceResult);

      if (allowanceResult.error) {
        debugError('[Purro] ❌ Allowance check failed:', allowanceResult.error);
        throw new Error(allowanceResult.error);
      }

      const allowance = allowanceResult.data?.allowance || allowanceResult.data;
      // Convert human-readable amount to token units using decimals
      const erc20Decimals = tokenIn.decimals ?? 18;
      const amountInWei = ethers.parseUnits(amountIn, erc20Decimals);
      const allowanceWei = BigInt(allowance);

      debugLog('[Purro] 💰 Allowance comparison:', {
        amountInWei: amountInWei.toString(),
        allowanceWei: allowanceWei.toString(),
        needsApproval: allowanceWei < amountInWei
      });

      // If allowance is insufficient, request approval
      if (allowanceWei < amountInWei) {
        debugLog('[Purro] 🔓 Requesting token approval...');

        const approvalData = {
          tokenAddress: tokenIn.contractAddress,
          spenderAddress: spenderAddress,
          amount: amountInWei.toString(),
          chainId: SWAP_CONSTANTS.HYPEREVM_CHAIN_ID,
        };

        debugLog('[Purro] 📞 Calling EVM_APPROVE_TOKEN with:', approvalData);

        const approvalResult = await sendMessage(
          'EVM_APPROVE_TOKEN',
          approvalData
        );

        debugLog('[Purro] 📋 Approval result:', approvalResult);

        if (approvalResult.error) {
          debugError('[Purro] ❌ Token approval failed:', approvalResult.error);
          throw new Error(approvalResult.error || SWAP_CONSTANTS.ERROR_MESSAGES.TOKEN_APPROVAL_FAILED);
        }

        debugLog('[Purro] ✅ Token approval successful');
      } else {
        debugLog('[Purro] ✅ Sufficient allowance, no approval needed');
      }
    } else {
      debugLog('[Purro] ⏭️ Skipping allowance check (native token or wrap/unwrap)');
    }

    // Step 2: Execute the swap transaction
    let transactionData: TransactionData;
    let result: TransactionResult;

    debugLog('[Purro] 🚀 Executing swap transaction...');

    // Check if this is a direct wrap/unwrap scenario
    if (isDirectWrapUnwrapScenario) {
      debugLog('[Purro] 🔄 Processing direct wrap/unwrap scenario');

      if (isWrapScenario(tokenIn, tokenOut)) {
        debugLog('[Purro] 📦 Wrapping native token to wrapped token');
        // HYPE -> WHYPE: Call wrap function on WHYPE contract
        const amountInFloat = parseFloat(amountIn);
        const decimals = tokenIn.decimals || 18;
        const amountInWei = BigInt(
          Math.floor(amountInFloat * Math.pow(10, decimals))
        );

        transactionData = {
          to: tokenOut.contractAddress || '',
          data: SWAP_CONSTANTS.WRAP_FUNCTION_SELECTOR,
          value: `0x${amountInWei.toString(16)}`,
          chainId: SWAP_CONSTANTS.HYPEREVM_CHAIN_ID,
        };

        debugLog('[Purro] 📦 Wrap transaction data:', transactionData);
      } else {
        debugLog('[Purro] 📤 Unwrapping wrapped token to native token');
        // WHYPE -> HYPE: Call unwrap function on WHYPE contract
        const amountInFloat = parseFloat(amountIn);
        const decimals = tokenIn.decimals || 18;
        const amountInWei = BigInt(
          Math.floor(amountInFloat * Math.pow(10, decimals))
        );

        transactionData = {
          to: tokenOut.contractAddress || '',
          data: `${SWAP_CONSTANTS.UNWRAP_FUNCTION_SELECTOR}${amountInWei.toString(16).padStart(64, '0')}`, // withdraw(uint256) function
          value: '0x0',
          chainId: SWAP_CONSTANTS.HYPEREVM_CHAIN_ID,
        };

        debugLog('[Purro] 📤 Unwrap transaction data:', transactionData);
      }

      // Send transaction via background script
      debugLog('[Purro] 📞 Calling EVM_SWAP_HYPERLIQUID_TOKEN for wrap/unwrap');
      result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', transactionData);
    } else {
      debugLog('[Purro] 🔀 Processing regular swap transaction');
      // Handle regular swap
      let transactionValue = '0x0';

      if (isFromNativeToken) {
        debugLog('[Purro] 💰 Adding native token value to transaction');
        // Convert human-readable amount to wei for native token transfer
        const amountInFloat = parseFloat(amountIn);
        const decimals = tokenIn.decimals || 18;
        const amountInWei = BigInt(
          Math.floor(amountInFloat * Math.pow(10, decimals))
        );
        transactionValue = `0x${amountInWei.toString(16)}`;
      }

      // Prepare transaction data
      transactionData = {
        to: route.execution?.to || '',
        data: route.execution?.calldata || '',
        value: transactionValue,
      };

      debugLog('[Purro] 🔀 Regular swap transaction data:', transactionData);

      // Send transaction via background script
      debugLog('[Purro] 📞 Calling EVM_SWAP_HYPERLIQUID_TOKEN for regular swap');
      result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', transactionData);
    }

    debugLog('[Purro] 📋 Transaction result:', result);

    if (!result.success) {
      debugError('[Purro] ❌ Swap transaction failed:', result.error);
      throw new Error(result.error || 'Swap transaction failed');
    }

    debugLog('[Purro] ✅ Swap transaction successful:', result.data);
    return { success: true, data: result.data as string };
  } catch (error) {
    debugError('[Purro] ❌ Swap transaction error:', error);
    debugError('[Purro] ❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Re-throw the error so it can be caught by the UI layer
    throw error;
  }
};
