import { sendMessage } from '@/client/utils/extension-message-utils';
import { UnifiedToken } from '@/client/components/token-list';
import { isHypeToken, isWrapScenario, isUnwrapScenario } from './swap-utils';
import { SwapRouteV2Response } from '@/client/types/liquidswap-api';

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

// Swap execution result interface
interface SwapExecutionResult {
  success: boolean;
  data?: string; // Transaction hash when successful
  error?: string;
}

export interface SwapTransactionParams {
  tokenIn: UnifiedToken;
  tokenOut: UnifiedToken;
  amountIn: string;
  amountOut: string;
  route: SwapRouteV2Response;
  activeAccountAddress: string;
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
  try {
    // Determine if this is a direct wrap/unwrap scenario
    const isDirectWrapUnwrapScenario =
      isWrapScenario(tokenIn, tokenOut) || isUnwrapScenario(tokenIn, tokenOut);

    // Check if tokens are native (ETH, MATIC, etc.)
    const isFromNativeToken = isHypeToken(tokenIn);

    // Step 1: Handle approval for ERC20 tokens (skip for direct wrap/unwrap)
    if (!isFromNativeToken && !isDirectWrapUnwrapScenario) {
      const spenderAddress = route.execution?.to;
      if (!spenderAddress) {
        throw new Error('No spender address in route execution');
      }

      // Check current allowance
      const allowanceData = {
        tokenAddress: tokenIn.contractAddress,
        ownerAddress: '', // Will be set by the background script
        spenderAddress: spenderAddress,
        chainId: '0x3e7', // HyperEVM
      };

      const allowanceResult = await sendMessage(
        'EVM_CHECK_TOKEN_ALLOWANCE',
        allowanceData
      );

      if (allowanceResult.error) {
        throw new Error(allowanceResult.error);
      }

      const allowance = allowanceResult.data;
      const amountInWei = BigInt(amountIn);
      const allowanceWei = BigInt(allowance);

      // If allowance is insufficient, request approval
      if (allowanceWei < amountInWei) {
        const approvalData = {
          tokenAddress: tokenIn.contractAddress,
          spenderAddress: spenderAddress,
          amount: amountInWei.toString(),
          chainId: '0x3e7', // HyperEVM
        };

        const approvalResult = await sendMessage(
          'EVM_APPROVE_TOKEN',
          approvalData
        );

        if (approvalResult.error) {
          throw new Error(approvalResult.error || 'Token approval failed');
        }
      }
    }

    // Step 2: Execute the swap transaction
    let transactionData: TransactionData;
    let result: TransactionResult;

    // Check if this is a direct wrap/unwrap scenario
    if (isDirectWrapUnwrapScenario) {
      if (isWrapScenario(tokenIn, tokenOut)) {
        // HYPE -> WHYPE: Call wrap function on WHYPE contract
        const amountInFloat = parseFloat(amountIn);
        const decimals = tokenIn.decimals || 18;
        const amountInWei = BigInt(
          Math.floor(amountInFloat * Math.pow(10, decimals))
        );

        transactionData = {
          to: tokenOut.contractAddress || '',
          data: `0xd0e30db0`, // wrap() function selector
          value: `0x${amountInWei.toString(16)}`,
          chainId: '0x3e7', // HyperEVM
        };
      } else {
        // WHYPE -> HYPE: Call unwrap function on WHYPE contract
        const amountInFloat = parseFloat(amountIn);
        const decimals = tokenIn.decimals || 18;
        const amountInWei = BigInt(
          Math.floor(amountInFloat * Math.pow(10, decimals))
        );

        transactionData = {
          to: tokenOut.contractAddress || '',
          data: `0x2e1a7d4d${amountInWei.toString(16).padStart(64, '0')}`, // withdraw(uint256) function
          value: '0x0',
          chainId: '0x3e7', // HyperEVM
        };
      }

      // Send transaction via background script
      result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', transactionData);
    } else {
      // Handle regular swap
      let transactionValue = '0x0';

      if (isFromNativeToken) {
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

      // Send transaction via background script
      result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', transactionData);
    }

    if (!result.success) {
      throw new Error(result.error || 'Swap transaction failed');
    }

    return { success: true, data: result.data as string };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
