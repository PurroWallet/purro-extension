import { sendMessage } from '@/client/utils/extension-message-utils';
import { UnifiedToken } from '@/client/components/token-list';
import { isHypeToken, isWrapScenario, isUnwrapScenario } from './swap-utils';

export interface SwapTransactionParams {
    tokenIn: UnifiedToken;
    tokenOut: UnifiedToken;
    amountIn: string;
    amountOut: string;
    route: any;
    activeAccountAddress: string;
}

export const executeSwapTransaction = async ({
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    route,
    activeAccountAddress,
}: SwapTransactionParams): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
        const actionType = isWrapScenario(tokenIn, tokenOut)
            ? 'wrap'
            : isUnwrapScenario(tokenIn, tokenOut)
                ? 'unwrap'
                : 'swap';

        console.log(`🔄 Starting ${actionType} with automatic approval...`, {
            tokenIn: tokenIn.symbol,
            tokenOut: tokenOut.symbol,
            amountIn,
            amountOut,
            route: route.execution,
            actionType,
        });

        if (!route.execution) {
            throw new Error('No execution data in route');
        }

        // Check if this is a direct wrap/unwrap scenario
        const isDirectWrapUnwrapScenario = isWrapScenario(tokenIn, tokenOut) || isUnwrapScenario(tokenIn, tokenOut);

        // Determine if we're swapping from native token
        const isFromNativeToken = isHypeToken(tokenIn);

        // Step 1: Handle approval for ERC20 tokens (skip for direct wrap/unwrap)
        if (!isFromNativeToken && !isDirectWrapUnwrapScenario) {
            console.log('🔍 Checking and handling token approval...');

            const spenderAddress = route.execution.to;
            if (!spenderAddress) {
                throw new Error('No spender address found in route');
            }

            // Check current allowance
            const allowanceData = {
                tokenAddress: tokenIn.contractAddress,
                ownerAddress: activeAccountAddress,
                spenderAddress: spenderAddress,
                chainId: '0x3e7', // HyperEVM
            };

            console.log('🔍 Checking token allowance:', allowanceData);
            const allowanceResult = await sendMessage(
                'EVM_CHECK_TOKEN_ALLOWANCE',
                allowanceData
            );

            if (!allowanceResult.success) {
                throw new Error(allowanceResult.error || 'Failed to check allowance');
            }

            const allowance = allowanceResult.data.allowance;

            // Convert current amount to wei for comparison
            const amountInFloat = parseFloat(amountIn);
            const decimals = tokenIn.decimals || 18;
            const amountInWei = BigInt(
                Math.floor(amountInFloat * Math.pow(10, decimals))
            );
            const allowanceWei = BigInt(allowance);

            console.log('💰 Allowance check:', {
                currentAllowance: allowance,
                requiredAmount: amountInWei.toString(),
                needsApproval: allowanceWei < amountInWei,
            });

            // If allowance is insufficient, request approval
            if (allowanceWei < amountInWei) {
                console.log('🔓 Requesting token approval...');

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

                if (!approvalResult.success) {
                    throw new Error(approvalResult.error || 'Token approval failed');
                }

                console.log('✅ Token approval successful:', approvalResult.data);
            } else {
                console.log('✅ Sufficient allowance already exists');
            }
        }

        // Step 2: Execute the swap transaction
        console.log('🔄 Executing swap transaction...');

        let transactionData: any;
        let result: any;

        // Check if this is a direct wrap/unwrap scenario
        if (isDirectWrapUnwrapScenario) {
            console.log('🔄 Executing direct wrap/unwrap...');

            if (isWrapScenario(tokenIn, tokenOut)) {
                // HYPE -> WHYPE: Call wrap function on WHYPE contract
                const amountInFloat = parseFloat(amountIn);
                const decimals = tokenIn.decimals || 18;
                const amountInWei = BigInt(
                    Math.floor(amountInFloat * Math.pow(10, decimals))
                );

                transactionData = {
                    to: '0x5555555555555555555555555555555555555555', // WHYPE contract
                    data: `0xd0e30db0`, // wrap() function selector
                    value: `0x${amountInWei.toString(16)}`,
                };
            } else {
                // WHYPE -> HYPE: Call unwrap function on WHYPE contract
                const amountInFloat = parseFloat(amountIn);
                const decimals = tokenIn.decimals || 18;
                const amountInWei = BigInt(
                    Math.floor(amountInFloat * Math.pow(10, decimals))
                );

                transactionData = {
                    to: '0x5555555555555555555555555555555555555555', // WHYPE contract
                    data: `0x2e1a7d4d${amountInWei.toString(16).padStart(64, '0')}`, // withdraw(uint256) function
                    value: '0x0',
                };
            }

            console.log('📝 Direct wrap/unwrap transaction data:', transactionData);

            // Send transaction via background script
            result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', {
                transaction: transactionData,
            });
        } else {
            // Handle regular swap
            let transactionValue = '0';

            if (isFromNativeToken) {
                // Convert human-readable amount to wei for native token transfer
                const amountInFloat = parseFloat(amountIn);
                const decimals = tokenIn.decimals || 18;
                const amountInWei = BigInt(
                    Math.floor(amountInFloat * Math.pow(10, decimals))
                );
                transactionValue = `0x${amountInWei.toString(16)}`;

                console.log('💰 Native token swap detected:', {
                    symbol: tokenIn.symbol,
                    amountIn,
                    amountInWei: amountInWei.toString(),
                    transactionValue,
                });
            }

            // Prepare transaction data
            transactionData = {
                to: route.execution.to,
                data: route.execution.calldata,
                value: transactionValue,
            };

            console.log('📝 Swap transaction data:', transactionData);

            // Send transaction via background script
            result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', {
                transaction: transactionData,
            });
        }

        if (!result.success) {
            throw new Error(result.error || 'Swap transaction failed');
        }

        console.log('✅ Swap transaction successful:', result.data);
        return { success: true, data: result.data };

    } catch (error) {
        console.error(`❌ Swap failed:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Transaction failed'
        };
    }
}; 