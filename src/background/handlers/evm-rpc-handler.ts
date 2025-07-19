import { MessageResponse } from './evm-handler';
import { supportedEVMChains } from '../constants/supported-chains';
import { STORAGE_KEYS } from '../constants/storage-keys';

// Helper function to get current chain ID
const getCurrentChainId = async (): Promise<number> => {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_CHAIN_ID);
        const chainId = result[STORAGE_KEYS.CURRENT_CHAIN_ID] || '0x1'; // Default to Ethereum mainnet
        return parseInt(chainId, 16);
    } catch (error) {
        console.error('Error getting current chain ID:', error);
        return 1; // Default to Ethereum mainnet
    }
};

// Helper function to make RPC calls to blockchain networks
const makeRpcCall = async (method: string, params: any[], chainId: number): Promise<any> => {
    try {
        const chainIdHex = `0x${chainId.toString(16)}`;
        const chainInfo = supportedEVMChains[chainIdHex];

        if (!chainInfo) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        // Get the first RPC URL from the chain info
        const rpcUrl = chainInfo.rpcUrls[0];
        if (!rpcUrl) {
            throw new Error(`No RPC URL found for chain ${chainId}`);
        }

        const requestBody = {
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
        };

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`RPC error: ${data.error.message}`);
        }

        return data.result;
    } catch (error) {
        console.error('RPC call failed:', error);
        throw error;
    }
};

// Helper function to create success response
const createSuccessResponse = (data: any): MessageResponse => {
    return {
        success: true,
        data
    };
};

// Helper function to create error response
const createErrorResponse = (error: string, code?: number): MessageResponse => {
    return {
        success: false,
        error,
        code
    };
};

export const evmRpcHandler = {
    async handleEvmGetBalance(data: { address: string, blockTag?: string, chainId?: number | string }): Promise<MessageResponse> {
        try {
            const { address, blockTag = 'latest', chainId } = data;

            // Validate address
            if (!address || typeof address !== 'string') {
                return createErrorResponse('Invalid address parameter', 4001);
            }

            // Convert chainId to number if it's a string
            let targetChainId: number;
            if (typeof chainId === 'string') {
                targetChainId = parseInt(chainId, 10);
                if (isNaN(targetChainId)) {
                    return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
                }
            } else {
                targetChainId = chainId || await getCurrentChainId();
            }

            console.log(`🔗 Getting balance for address ${address} on chain ${targetChainId}`);
            const balance = await makeRpcCall('eth_getBalance', [address, blockTag], targetChainId);

            return createSuccessResponse({ balance, chainId: targetChainId });
        } catch (error) {
            console.error('Error in handleEvmGetBalance:', error);
            return createErrorResponse(error instanceof Error ? error.message : 'Failed to get balance', 4001);
        }
    }
};