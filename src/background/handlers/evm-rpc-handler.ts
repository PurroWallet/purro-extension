import { MessageResponse } from './evm-handler';
import { supportedEVMChains } from '../constants/supported-chains';
import { STORAGE_KEYS } from '../constants/storage-keys';

// Helper function to get current chain ID
const getCurrentChainId = async (): Promise<number> => {
  try {
    const result = await chrome.storage.local.get(
      STORAGE_KEYS.CURRENT_CHAIN_ID
    );
    const chainId = result[STORAGE_KEYS.CURRENT_CHAIN_ID] || '0x1'; // Default to Ethereum mainnet
    return parseInt(chainId, 16);
  } catch (error) {
    console.error('Error getting current chain ID:', error);
    return 1; // Default to Ethereum mainnet
  }
};

// Helper function to make RPC calls to blockchain networks
const makeRpcCall = async (
  method: string,
  params: any[],
  chainId: number
): Promise<any> => {
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
      id: Date.now(),
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `RPC request failed: ${response.status} ${response.statusText}`
      );
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
    data,
  };
};

// Helper function to create error response
const createErrorResponse = (error: string, code?: number): MessageResponse => {
  return {
    success: false,
    error,
    code,
  };
};

export const evmRpcHandler = {
  async handleEvmGetBalance(data: {
    address: string;
    blockTag?: string;
    chainId?: number | string;
  }): Promise<MessageResponse> {
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
        targetChainId = chainId || (await getCurrentChainId());
      }

      const balance = await makeRpcCall(
        'eth_getBalance',
        [address, blockTag],
        targetChainId
      );

      return createSuccessResponse({ balance, chainId: targetChainId });
    } catch (error) {
      console.error('Error in handleEvmGetBalance:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get balance',
        4001
      );
    }
  },

  async handleEvmCall(data: {
    callObject: any;
    blockTag?: string;
    chainId?: number | string;
  }): Promise<MessageResponse> {
    try {
      const { callObject, blockTag = 'latest', chainId } = data;

      // Validate call object
      if (!callObject || typeof callObject !== 'object') {
        return createErrorResponse('Invalid call object parameter', 4001);
      }

      // Convert chainId to number if it's a string
      let targetChainId: number;
      if (typeof chainId === 'string') {
        targetChainId = parseInt(chainId, 10);
        if (isNaN(targetChainId)) {
          return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
        }
      } else {
        targetChainId = chainId || (await getCurrentChainId());
      }

      const result = await makeRpcCall(
        'eth_call',
        [callObject, blockTag],
        targetChainId
      );

      return createSuccessResponse({ data: result, chainId: targetChainId });
    } catch (error) {
      console.error('Error in handleEvmCall:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to make call',
        4001
      );
    }
  },

  async handleEvmGetBlockNumber(data?: {
    chainId?: number | string;
  }): Promise<MessageResponse> {
    try {
      const { chainId } = data || {};

      // Convert chainId to number if it's a string
      let targetChainId: number;
      if (typeof chainId === 'string') {
        targetChainId = parseInt(chainId, 10);
        if (isNaN(targetChainId)) {
          return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
        }
      } else {
        targetChainId = chainId || (await getCurrentChainId());
      }

      const blockNumber = await makeRpcCall(
        'eth_blockNumber',
        [],
        targetChainId
      );

      return createSuccessResponse({ blockNumber, chainId: targetChainId });
    } catch (error) {
      console.error('Error in handleEvmGetBlockNumber:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get block number',
        4001
      );
    }
  },

  async handleEvmEstimateGas(data: {
    txObject: any;
    chainId?: number | string;
  }): Promise<MessageResponse> {
    try {
      const { txObject, chainId } = data;

      // Validate transaction object
      if (!txObject || typeof txObject !== 'object') {
        return createErrorResponse(
          'Invalid transaction object parameter',
          4001
        );
      }

      // Convert chainId to number if it's a string
      let targetChainId: number;
      if (typeof chainId === 'string') {
        targetChainId = parseInt(chainId, 10);
        if (isNaN(targetChainId)) {
          return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
        }
      } else {
        targetChainId = chainId || (await getCurrentChainId());
      }

      const gasEstimate = await makeRpcCall(
        'eth_estimateGas',
        [txObject],
        targetChainId
      );

      return createSuccessResponse({ gasEstimate, chainId: targetChainId });
    } catch (error) {
      console.error('Error in handleEvmEstimateGas:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to estimate gas',
        4001
      );
    }
  },

  async handleEvmGetGasPrice(data?: {
    chainId?: number | string;
  }): Promise<MessageResponse> {
    try {
      const { chainId } = data || {};

      // Convert chainId to number if it's a string
      let targetChainId: number;
      if (typeof chainId === 'string') {
        targetChainId = parseInt(chainId, 10);
        if (isNaN(targetChainId)) {
          return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
        }
      } else {
        targetChainId = chainId || (await getCurrentChainId());
      }

      const gasPrice = await makeRpcCall('eth_gasPrice', [], targetChainId);

      return createSuccessResponse({ gasPrice, chainId: targetChainId });
    } catch (error) {
      console.error('Error in handleEvmGetGasPrice:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get gas price',
        4001
      );
    }
  },

  async handleEvmGetTransactionByHash(data: {
    txHash: string;
    chainId?: number | string;
  }): Promise<MessageResponse> {
    try {
      const { txHash, chainId } = data;

      // Validate transaction hash
      if (!txHash || typeof txHash !== 'string') {
        return createErrorResponse('Invalid transaction hash parameter', 4001);
      }

      // Convert chainId to number if it's a string
      let targetChainId: number;
      if (typeof chainId === 'string') {
        targetChainId = parseInt(chainId, 10);
        if (isNaN(targetChainId)) {
          return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
        }
      } else {
        targetChainId = chainId || (await getCurrentChainId());
      }

      const transaction = await makeRpcCall(
        'eth_getTransactionByHash',
        [txHash],
        targetChainId
      );

      return createSuccessResponse({ transaction, chainId: targetChainId });
    } catch (error) {
      console.error('Error in handleEvmGetTransactionByHash:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get transaction',
        4001
      );
    }
  },

  async handleEvmGetTransactionReceipt(data: {
    txHash: string;
    chainId?: number | string;
  }): Promise<MessageResponse> {
    try {
      const { txHash, chainId } = data;

      // Validate transaction hash
      if (!txHash || typeof txHash !== 'string') {
        return createErrorResponse('Invalid transaction hash parameter', 4001);
      }

      // Convert chainId to number if it's a string
      let targetChainId: number;
      if (typeof chainId === 'string') {
        targetChainId = parseInt(chainId, 10);
        if (isNaN(targetChainId)) {
          return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
        }
      } else {
        targetChainId = chainId || (await getCurrentChainId());
      }

      const receipt = await makeRpcCall(
        'eth_getTransactionReceipt',
        [txHash],
        targetChainId
      );

      return createSuccessResponse({ receipt, chainId: targetChainId });
    } catch (error) {
      console.error('Error in handleEvmGetTransactionReceipt:', error);
      return createErrorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to get transaction receipt',
        4001
      );
    }
  },

  async handleCheckTransactionStatus(data: {
    txHash: string;
    network?: string;
    chainId?: number | string;
  }): Promise<MessageResponse> {
    try {
      const { txHash, network, chainId } = data;

      // Validate transaction hash
      if (!txHash || typeof txHash !== 'string') {
        return createErrorResponse('Invalid transaction hash parameter', 4001);
      }

      // Map network to chainId if provided
      let targetChainId: number;
      if (network) {
        switch (network.toLowerCase()) {
          case 'ethereum':
            targetChainId = 1;
            break;
          case 'arbitrum':
            targetChainId = 42161;
            break;
          case 'base':
            targetChainId = 8453;
            break;
          default:
            return createErrorResponse(`Unsupported network: ${network}`, 4001);
        }
      } else if (typeof chainId === 'string') {
        targetChainId = parseInt(chainId, 10);
        if (isNaN(targetChainId)) {
          return createErrorResponse(`Invalid chainId: ${chainId}`, 4001);
        }
      } else {
        targetChainId = chainId || (await getCurrentChainId());
      }

      // Get transaction receipt
      const receipt = await makeRpcCall(
        'eth_getTransactionReceipt',
        [txHash],
        targetChainId
      );

      // Determine transaction status
      let confirmed = false;
      let failed = false;

      if (receipt) {
        // Receipt exists, transaction is mined
        confirmed = true;
        // Check if transaction failed (status = 0x0)
        if (receipt.status === '0x0') {
          failed = true;
        }
      } else {
        // No receipt yet, check if transaction exists
        const transaction = await makeRpcCall(
          'eth_getTransactionByHash',
          [txHash],
          targetChainId
        );

        if (!transaction) {
          // Transaction doesn't exist, might be failed or not yet propagated
          failed = true;
        }
        // If transaction exists but no receipt, it's still pending
      }

      return createSuccessResponse({
        confirmed,
        failed,
        receipt,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed,
      });
    } catch (error) {
      console.error('Error in handleCheckTransactionStatus:', error);
      return createErrorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to check transaction status',
        4001
      );
    }
  },
};
