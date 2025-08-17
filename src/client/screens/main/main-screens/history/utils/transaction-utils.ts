import { ethers } from 'ethers';
import type { EtherscanTransaction } from '@/client/types/etherscan-api';
import type { ChainType } from '@/client/types/wallet';
import { COMMON_FUNCTION_ABIS } from '@/client/constants/chain-filter-options';
import type {
    TransactionAnalysis,
    ExtractedTokenInfo,
    DecodedTransactionData,
} from '../types';

// Helper function to map chainId to ChainType for TokenLogo
export const getChainType = (chainId: number): ChainType | undefined => {
    switch (chainId) {
        case 1:
            return 'ethereum';
        case 42161:
            return 'arbitrum';
        case 8453:
            return 'base';
        case 999:
            return 'hyperevm';
        default:
            return undefined;
    }
};

// Create ethers interface for decoding
const commonInterface = new ethers.Interface(COMMON_FUNCTION_ABIS);

// Function to decode transaction input data
export const decodeTransactionData = (
    inputData: string
): DecodedTransactionData | null => {
    if (!inputData || inputData === '0x' || inputData.length < 10) {
        return null;
    }

    const methodId = inputData.slice(0, 10);

    // Special handling for executeSwaps method ID 0xa22c27fe
    if (methodId === '0xa22c27fe') {
        try {
            // Try to decode with a simplified ABI first to get basic parameters
            const simplifiedInterface = new ethers.Interface([
                'function executeSwaps(address[] tokens, uint256 amountIn, uint256 minAmountOut, uint256 expectedAmountOut, bytes hopSwaps, uint256 feeBps, address feeRecipient)',
            ]);

            const decoded = simplifiedInterface.parseTransaction({ data: inputData });
            if (decoded && decoded.args) {
                return {
                    name: 'executeSwaps',
                    args: decoded.args,
                };
            }
        } catch (error) {
            console.error('Error decoding executeSwaps:', error);
            // Simplified ABI failed
        }

        // Fallback to manual parsing
        return {
            name: 'executeSwaps',
            args: [], // We'll parse manually in the extraction function
        };
    }

    try {
        const decoded = commonInterface.parseTransaction({ data: inputData });
        if (!decoded) {
            return null;
        }
        return {
            name: decoded.name,
            args: decoded.args,
        };
    } catch (error) {
        console.error('Error decoding transaction data:', error);
        return null;
    }
};

// Helper function to analyze transaction method using dynamic decoding
export const analyzeTransactionMethod = (
    tx: EtherscanTransaction,
    userAddress: string
): TransactionAnalysis => {
    const input = tx.input;
    const isFromUser = tx.from.toLowerCase() === userAddress.toLowerCase();

    // Check if it's a simple ETH transfer
    if (!input || input === '0x') {
        return {
            method: isFromUser ? 'send' : 'receive',
            isTokenTransfer: false,
        };
    }

    // Try to decode the transaction data
    const decodedData = decodeTransactionData(input);

    if (decodedData) {
        const functionName = decodedData.name.toLowerCase();

        // Analyze based on decoded function name
        switch (functionName) {
            case 'transfer':
            case 'transferfrom':
                return {
                    method: isFromUser ? 'send' : 'receive',
                    isTokenTransfer: true,
                };

            case 'approve':
                // Map approve to send (outgoing transaction)
                return {
                    method: 'send',
                    isTokenTransfer: true,
                };

            case 'swapexactethfortokens':
            case 'swapexacttokensfortokens':
            case 'swaptokensforexacttokens':
            case 'swapexactethfortokenssupportingfeeontransfertokens':
            case 'swapexacttokensforethsupportingfeeontransfertokens':
            case 'exactinputsingle':
            case 'exactoutputsingle':
            case 'swap':
            case 'unoswap':
            case 'executeswaps':
                return {
                    method: 'swap',
                    isTokenTransfer: true,
                };

            case 'addliquidity':
            case 'addliquidityeth':
            case 'removeliquidity':
            case 'removeliquidityeth':
                return {
                    method: functionName.includes('add') ? 'deposit' : 'withdraw',
                    isTokenTransfer: true,
                };

            case 'deposit':
                return {
                    method: 'deposit',
                    isTokenTransfer: true,
                };

            case 'withdraw':
                return {
                    method: 'withdraw',
                    isTokenTransfer: true,
                };

            default:
                // For any other decoded function, map to send (outgoing interaction)
                return {
                    method: 'send',
                    isTokenTransfer: true,
                };
        }
    }

    // Fallback: check the legacy functionName field from Etherscan
    const functionName = tx.functionName?.toLowerCase();
    if (functionName) {
        if (functionName.includes('swap')) {
            return { method: 'swap', isTokenTransfer: true };
        }
        if (functionName.includes('deposit')) {
            return { method: 'deposit', isTokenTransfer: true };
        }
        if (functionName.includes('withdraw')) {
            return { method: 'withdraw', isTokenTransfer: true };
        }
        if (functionName.includes('transfer')) {
            return {
                method: isFromUser ? 'send' : 'receive',
                isTokenTransfer: true,
            };
        }
    }

    // Default for contract interactions - map to send
    return {
        method: 'send',
        isTokenTransfer: false,
    };
};

// Helper function to decode transaction input for better token detection
export const isLikelyTokenTransfer = (tx: EtherscanTransaction): boolean => {
    // Check if it's a contract interaction with specific patterns
    if (!tx.input || tx.input === '0x') return false;

    // Try to decode the transaction data
    const decodedData = decodeTransactionData(tx.input);

    // If we can decode it with our common ABIs, it's likely a token-related transaction
    return decodedData !== null;
};

// Helper function to extract token information from decoded transaction data
export const extractTokenInfoFromTransaction = (
    tx: EtherscanTransaction
): ExtractedTokenInfo => {
    if (!tx.input || tx.input === '0x') {
        return {};
    }

    const decodedData = decodeTransactionData(tx.input);

    if (!decodedData || !decodedData.args) {
        return {};
    }

    const functionName = decodedData.name.toLowerCase();
    const args = decodedData.args;

    try {
        switch (functionName) {
            case 'transfer':
                // transfer(address to, uint256 amount)
                return {
                    tokenAddress: tx.to, // The contract being called
                    tokenAmount: args[1]?.toString() || '0',
                };

            case 'transferfrom':
                // transferFrom(address from, address to, uint256 amount)
                return {
                    tokenAddress: tx.to, // The contract being called
                    tokenAmount: args[2]?.toString() || '0',
                };

            case 'approve':
                // approve(address spender, uint256 amount)
                return {
                    tokenAddress: tx.to, // The contract being called
                    tokenAmount: args[1]?.toString() || '0',
                };

            case 'executeswaps':
                // executeSwaps(address[] tokens, uint256 amountIn, uint256 minAmountOut, uint256 expectedAmountOut,
                //              Swap[][] hopSwaps, uint256 feeBps, address feeRecipient)
                try {
                    if (tx.input && tx.input.startsWith('0xa22c27fe')) {
                        // Try to parse with ethers if args are available
                        if (args && args.length >= 5) {
                            const tokens = args[0] as string[]; // address[] tokens - the overall path
                            const amountIn = args[1]?.toString() || '0'; // uint256 amountIn

                            // Extract input and output tokens from the path
                            if (tokens && tokens.length >= 2) {
                                const inputToken = tokens[0]; // First token in path
                                const outputToken = tokens[tokens.length - 1]; // Last token in path

                                // Return both input and output token info
                                return {
                                    tokenAddress: inputToken,
                                    tokenAmount: amountIn,
                                    outputTokenAddress: outputToken,
                                    outputTokenAmount: '0', // Will be estimated from manual parsing
                                };
                            }
                        }

                        // If args are empty, try manual parsing of the input data
                        if (!args || args.length === 0) {
                            try {
                                const inputData = tx.input.slice(10);
                                const abiCoder = ethers.AbiCoder.defaultAbiCoder();

                                // Try to decode first 4 parameters to get minAmountOut
                                try {
                                    const decoded4 = abiCoder.decode(
                                        ['address[]', 'uint256', 'uint256', 'uint256'],
                                        '0x' + inputData
                                    );
                                    const tokens = decoded4[0] as string[];
                                    const amountIn = decoded4[1].toString();
                                    const minAmountOut = decoded4[2].toString();

                                    if (tokens && tokens.length >= 2) {
                                        return {
                                            tokenAddress: tokens[0],
                                            tokenAmount: amountIn,
                                            outputTokenAddress: tokens[tokens.length - 1],
                                            outputTokenAmount: minAmountOut,
                                        };
                                    }
                                } catch {
                                    // Fallback: decode just first 2 parameters
                                    try {
                                        const decoded2 = abiCoder.decode(
                                            ['address[]', 'uint256'],
                                            '0x' + inputData
                                        );
                                        const tokens = decoded2[0] as string[];
                                        const amountIn = decoded2[1].toString();

                                        if (tokens && tokens.length >= 2) {
                                            return {
                                                tokenAddress: tokens[0],
                                                tokenAmount: amountIn,
                                                outputTokenAddress: tokens[tokens.length - 1],
                                                outputTokenAmount: '0',
                                            };
                                        }
                                    } catch {
                                        // All decode attempts failed
                                    }
                                }
                            } catch (error) {
                                console.error('❌ executeSwaps - Manual parsing error:', error);
                            }
                        }

                        // Final fallback
                        return {
                            tokenAddress: tx.to,
                            tokenAmount: tx.value || '0',
                        };
                    }

                    // This shouldn't happen
                } catch (error) {
                    console.error('Error parsing executeSwaps args:', error);
                }
                return {
                    tokenAddress: tx.to, // Fallback to contract address
                };

            default:
                // For other functions, we might not be able to extract specific token info
                return {
                    tokenAddress: tx.to, // At least we know the contract address
                };
        }
    } catch (error) {
        console.warn('Error extracting token info from transaction:', error);
        return {
            tokenAddress: tx.to,
        };
    }
}; 