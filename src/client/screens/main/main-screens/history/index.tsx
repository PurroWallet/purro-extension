import { ArrowDown, ArrowUp, Network } from 'lucide-react';
import TabsLoading from '../home/tabs/tabs-loading';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { useCachedInfiniteTransactions } from '@/client/hooks/use-transaction-cache';
import { useState, useMemo } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import type {
  EtherscanTransaction,
  MultiChainTransactionPage,
  ChainTransactionResult,
} from '@/client/types/etherscan-api';
import { NETWORK_ICONS } from '@/utils/network-icons';
import HistoryDetailDialog from './history-detail-dialog';
import TokenLogo from '@/client/components/token-logo';
import { ENDPOINTS } from '@/client/services/endpoints';
import type { ChainType } from '@/client/types/wallet';
import { ethers } from 'ethers';
import { fetchSingleTokenMetadataFast } from '@/client/services/alchemy-api';
import { fetchTokens } from '@/client/services/liquidswap-api';
import type { FetchTokenRequest } from '@/client/types/liquidswap-api';

// Chain ID mapping for supported networks
const CHAIN_IDS = {
  hyperevm: 999, // HyperEVM
  ethereum: 1, // Ethereum mainnet
  arbitrum: 42161, // Arbitrum One
  base: 8453, // Base mainnet
} as const;

type ChainFilter = keyof typeof CHAIN_IDS | 'all';

// Helper function to map chainId to ChainType for TokenLogo
const getChainType = (chainId: number): ChainType | undefined => {
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

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string; // Changed from icon to logo to match Alchemy API
}

interface TransactionWithChain extends EtherscanTransaction {
  chainId: number;
  chainName: string;
  type: 'send' | 'receive';
  method: 'send' | 'receive' | 'swap' | 'deposit' | 'withdraw';
  tokenInfo?: TokenInfo;
  tokenAmount?: string;
  outputTokenInfo?: TokenInfo;
  outputTokenAmount?: string;
  isTokenTransfer: boolean;
}

interface GroupedTransactions {
  date: string;
  transactions: TransactionWithChain[];
}

// Common ABI fragments for decoding transaction data
const COMMON_FUNCTION_ABIS = [
  // ERC20 functions
  'function transfer(address to, uint256 amount)',
  'function transferFrom(address from, address to, uint256 amount)',
  'function approve(address spender, uint256 amount)',

  // Uniswap V2 functions
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)',
  'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)',
  'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)',
  'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)',

  // Liquidity functions
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline)',
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline)',
  'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline)',

  // WETH functions
  'function deposit()',
  'function withdraw(uint256 amount)',

  // Uniswap V3 functions
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96))',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96))',

  // Common DEX aggregator functions
  'function swap(address caller, (address srcToken, address dstToken, address srcReceiver, address dstReceiver, uint256 amount, uint256 minReturnAmount, uint256 flags) desc, bytes permit, bytes data)',
  'function unoswap(address srcToken, uint256 amount, uint256 minReturn, uint256[] calldata pools)',

  // Custom DEX aggregator functions
  // Swap struct: (address tokenIn, address tokenOut, uint8 routerIndex, uint24 fee, uint256 amountIn, bool stable)
  'function executeSwaps(address[] calldata tokens, uint256 amountIn, uint256 minAmountOut, uint256 expectedAmountOut, tuple[][] calldata hopSwaps, uint256 feeBps, address feeRecipient)',
];

// Create ethers interface for decoding
const commonInterface = new ethers.Interface(COMMON_FUNCTION_ABIS);

// Function to decode transaction input data
const decodeTransactionData = (
  inputData: string
): { name: string; args?: any[] } | null => {
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
const analyzeTransactionMethod = (
  tx: EtherscanTransaction,
  userAddress: string
): {
  method: TransactionWithChain['method'];
  isTokenTransfer: boolean;
} => {
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

// Helper function to fetch token metadata for EVM chains using Alchemy
const fetchEvmTokenMetadata = async (
  tokenAddress: string,
  chainId: number
): Promise<TokenInfo> => {
  try {
    const endpoint = getAlchemyEndpoint(chainId);
    const metadata = await fetchSingleTokenMetadataFast(endpoint, tokenAddress);

    return {
      address: tokenAddress,
      name: metadata.name || 'Unknown Token',
      symbol: metadata.symbol || 'UNKNOWN',
      decimals: metadata.decimals || 18,
      logo: metadata.logo,
    };
  } catch (error) {
    console.warn(
      `Failed to fetch EVM token metadata for ${tokenAddress}:`,
      error
    );
    return {
      address: tokenAddress,
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
    };
  }
};

// Helper function to fetch token metadata for HyperEVM using LiquidSwap API
const fetchHyperEvmTokenMetadata = async (
  tokenAddress: string
): Promise<TokenInfo> => {
  try {
    const request: FetchTokenRequest = {
      search: tokenAddress,
      limit: 1,
      metadata: true,
    };

    const response = await fetchTokens(request);

    if (response.success && response.data.tokens.length > 0) {
      const token = response.data.tokens[0];
      return {
        address: tokenAddress,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
      };
    }

    // Fallback if not found
    return {
      address: tokenAddress,
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
    };
  } catch (error) {
    console.warn(
      `Failed to fetch HyperEVM token metadata for ${tokenAddress}:`,
      error
    );
    return {
      address: tokenAddress,
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
    };
  }
};

// Get Alchemy endpoint for chain
const getAlchemyEndpoint = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return ENDPOINTS.ALCHEMY_ETH_MAINNET;
    case 42161:
      return ENDPOINTS.ALCHEMY_ARB_MAINNET;
    case 8453:
      return ENDPOINTS.ALCHEMY_BASE_MAINNET;
    default:
      return ENDPOINTS.ALCHEMY_ETH_MAINNET; // Default to Ethereum
  }
};

// Main function to fetch token metadata based on chain
const fetchTokenMetadata = async (
  tokenAddress: string,
  chainId: number
): Promise<TokenInfo> => {
  try {
    let result: TokenInfo;

    if (tokenAddress === '0x000000000000000000000000000000000000dEaD' ) {
      return {
        address: tokenAddress,
        symbol: 'HYPE',
        name: 'Native HYPE',
        decimals: 18,
        logo: undefined,
      };
    }

    // Check if it's HyperEVM
    if (chainId === CHAIN_IDS.hyperevm) {
      result = await fetchHyperEvmTokenMetadata(tokenAddress);
    } else {
      // Use Alchemy for other EVM chains
      result = await fetchEvmTokenMetadata(tokenAddress, chainId);
    }

    return result;
  } catch (error) {
    console.error('❌ Token metadata fetch failed:', tokenAddress, error);
    // Return a fallback token info
    return {
      address: tokenAddress,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18,
      logo: undefined,
    };
  }
};

// Helper function to decode transaction input for better token detection
const isLikelyTokenTransfer = (tx: EtherscanTransaction): boolean => {
  // Check if it's a contract interaction with specific patterns
  if (!tx.input || tx.input === '0x') return false;

  // Try to decode the transaction data
  const decodedData = decodeTransactionData(tx.input);

  // If we can decode it with our common ABIs, it's likely a token-related transaction
  return decodedData !== null;
};

// Helper function to extract token information from decoded transaction data
const extractTokenInfoFromTransaction = (
  tx: EtherscanTransaction
): {
  tokenAddress?: string;
  tokenAmount?: string;
  outputTokenAddress?: string;
  outputTokenAmount?: string;
} => {
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
        //
        // Where Swap struct = {
        //   address tokenIn;       // Input token address
        //   address tokenOut;      // Output token address
        //   uint8 routerIndex;     // DEX router index (1-14)
        //   uint24 fee;            // Trading fee in basis points
        //   uint256 amountIn;      // Amount of input tokens for this specific swap
        //   bool stable;           // Whether to use stable pool
        // }
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

const History = () => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const { openDialog } = useDialogStore();
  const activeAccount = getActiveAccountWalletObject();
  const address = activeAccount?.eip155?.address;

  // Filter states
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');

  // Get active chain IDs based on filter
  const activeChainIds = useMemo(() => {
    if (chainFilter === 'all') {
      return Object.values(CHAIN_IDS);
    }
    return [CHAIN_IDS[chainFilter]];
  }, [chainFilter]);

  // Fetch transactions using the cached hook
  const { data, fetchNextPage, hasNextPage, isLoading, error } =
    useCachedInfiniteTransactions(address || '', activeChainIds, {
      enabled: !!address,
      sort: 'desc', // Most recent first
      offset: 100,
      enableCache: true, // Enable caching for better performance
    });

  // Token metadata cache to avoid repeated API calls
  const [tokenMetadataCache, setTokenMetadataCache] = useState<
    Map<string, TokenInfo>
  >(new Map());

  // Process and filter transactions
  const processedTransactions = useMemo(() => {
    if (!data || !address) return [];

    const allTransactions: TransactionWithChain[] = [];

    // Flatten all transactions from all pages and chains
    // Handle both possible data structures from useInfiniteQuery
    const pages = 'pages' in data ? data.pages : data;

    console.log('🔍 HISTORY DEBUG: Processing transaction data', {
      address: address.slice(0, 8) + '...',
      dataType: typeof data,
      hasPages: 'pages' in data,
      pagesLength: Array.isArray(pages) ? pages.length : 0,
      rawData: data,
    });

    if (Array.isArray(pages)) {
      pages.forEach((page: MultiChainTransactionPage, pageIndex: number) => {
        console.log(`📄 HISTORY DEBUG: Processing page ${pageIndex}`, {
          resultsCount: page.results.length,
          results: page.results.map(r => ({
            chainId: r.chainId,
            transactionCount: r.transactions.length,
            hasMore: r.hasMore,
          })),
        });

        page.results.forEach((result: ChainTransactionResult) => {
          console.log(`⛓️ HISTORY DEBUG: Processing chain ${result.chainId}`, {
            chainId: result.chainId,
            transactionCount: result.transactions.length,
            hasMore: result.hasMore,
            firstTxHash: result.transactions[0]?.hash?.slice(0, 10) + '...',
          });

          result.transactions.forEach((tx: EtherscanTransaction) => {
            const chainName =
              Object.keys(CHAIN_IDS).find(
                key =>
                  CHAIN_IDS[key as keyof typeof CHAIN_IDS] === result.chainId
              ) || 'unknown';

            const type: 'send' | 'receive' =
              tx.from.toLowerCase() === address.toLowerCase()
                ? 'send'
                : 'receive';

            // Analyze transaction to get method and token info
            const analysis = analyzeTransactionMethod(tx, address);

            // For token transfers, try to extract token info from transaction data
            let tokenInfo: TokenInfo | undefined;
            let tokenAmount: string | undefined;
            let outputTokenInfo: TokenInfo | undefined;
            let outputTokenAmount: string | undefined;

            // Enhanced token detection
            const isTokenTx =
              analysis.isTokenTransfer || isLikelyTokenTransfer(tx);

            if (isTokenTx) {
              // Extract token information from decoded transaction data
              const extractedInfo = extractTokenInfoFromTransaction(tx);
              const tokenAddress = extractedInfo.tokenAddress || tx.to;

              // Helper function to get or fetch token info
              const getTokenInfo = (address: string): TokenInfo => {
                const cacheKey = `${result.chainId}-${address.toLowerCase()}`;
                let info = tokenMetadataCache.get(cacheKey);

                if (!info) {
                  info = {
                    address: address,
                    name: 'Loading...',
                    symbol: 'LOADING',
                    decimals: 18,
                    logo: undefined,
                  };

                  // Fetch token metadata asynchronously
                  fetchTokenMetadata(address, result.chainId)
                    .then(metadata => {
                      setTokenMetadataCache(
                        prev => new Map(prev.set(cacheKey, metadata))
                      );
                    })
                    .catch(error => {
                      console.error('Error fetching token metadata:', error);
                    });
                }

                return info;
              };

              // Process input token
              if (tokenAddress) {
                tokenInfo = getTokenInfo(tokenAddress);

                // Use extracted token amount if available, otherwise use ETH value
                if (extractedInfo.tokenAmount) {
                  tokenAmount = extractedInfo.tokenAmount;
                } else if (tx.value === '0' || tx.value === '') {
                  tokenAmount = '0';
                } else {
                  tokenAmount = tx.value;
                }
              }

              // Process output token for swaps
              if (
                analysis.method === 'swap' &&
                extractedInfo.outputTokenAddress
              ) {
                outputTokenInfo = getTokenInfo(
                  extractedInfo.outputTokenAddress
                );
                outputTokenAmount = extractedInfo.outputTokenAmount || '0';
              }
            }

            allTransactions.push({
              ...tx,
              chainId: result.chainId,
              chainName,
              type,
              method: analysis.method,
              isTokenTransfer: isTokenTx,
              tokenInfo,
              tokenAmount,
              outputTokenInfo,
              outputTokenAmount,
            });
          });
        });
      });
    }

    // Sort by timestamp (most recent first)
    const sorted = allTransactions.sort(
      (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
    );

    return sorted;
  }, [data, address, tokenMetadataCache]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: GroupedTransactions[] = [];
    const groupMap = new Map<string, TransactionWithChain[]>();

    processedTransactions.forEach(tx => {
      const date = new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      );

      if (!groupMap.has(date)) {
        groupMap.set(date, []);
      }
      groupMap.get(date)!.push(tx);
    });

    // Convert map to array and sort by date (most recent first)
    Array.from(groupMap.entries())
      .sort(
        ([dateA], [dateB]) =>
          new Date(dateB).getTime() - new Date(dateA).getTime()
      )
      .forEach(([date, transactions]) => {
        groups.push({ date, transactions });
      });

    return groups;
  }, [processedTransactions]);
  // Helper function to format transaction value
  const formatValue = (value: string) => {
    const ethValue = parseFloat(value) / Math.pow(10, 18);
    return parseFloat(ethValue.toFixed(6)).toString();
  };

  // Helper function to format token amount based on decimals
  const formatTokenAmount = (amount: string, decimals: number = 18): string => {
    try {
      // Use ethers.formatUnits to handle very large numbers properly
      const ethersFormatted = ethers.formatUnits(amount, decimals);

      // For very large numbers, avoid parseFloat and work with strings
      const decimalIndex = ethersFormatted.indexOf('.');
      const integerPart =
        decimalIndex >= 0
          ? ethersFormatted.substring(0, decimalIndex)
          : ethersFormatted;
      const integerLength = integerPart.length;

      // Handle very large numbers (more than 15 digits) differently
      if (integerLength > 15) {
        // For extremely large numbers, show a simplified format
        const firstFewDigits = integerPart.substring(0, 3);
        const exponent = integerLength - 1;
        const result = `${firstFewDigits.charAt(0)}.${firstFewDigits.substring(1)}e+${exponent}`;
        return result;
      }

      // For smaller numbers, use parseFloat safely
      const formattedAmount = parseFloat(ethersFormatted);

      // Format based on size and remove trailing zeros
      if (formattedAmount === 0) return '0';
      if (formattedAmount < 0.0001) return formattedAmount.toExponential(2);
      if (formattedAmount < 1)
        return parseFloat(formattedAmount.toFixed(6)).toString();
      if (formattedAmount < 1000)
        return parseFloat(formattedAmount.toFixed(4)).toString();
      if (formattedAmount < 1000000)
        return parseFloat((formattedAmount / 1000).toFixed(2)).toString() + 'K';

      const finalResult =
        parseFloat((formattedAmount / 1000000).toFixed(2)).toString() + 'M';
      return finalResult;
    } catch (error) {
      console.error('formatTokenAmount - Error:', error);
      return '0';
    }
  };

  // Helper function to get chain icon
  const getChainIcon = (chainName: string) => {
    return NETWORK_ICONS[chainName as keyof typeof NETWORK_ICONS] || '';
  };

  if (isLoading && processedTransactions.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <TabsLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400">
          Error loading transactions: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transaction History</h1>
        <div className="text-sm text-muted-foreground">
          {processedTransactions.length} transactions
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Chain Filter */}
        <select
          value={chainFilter}
          onChange={e => setChainFilter(e.target.value as ChainFilter)}
          className="px-3 py-1 rounded-lg bg-[var(--card-color)] border border-[var(--border-color)] text-sm"
        >
          <option value="all">All Chains</option>
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="base">Base</option>
          <option value="hyperevm">HyperEVM</option>
        </select>
      </div>

      {/* No transactions message */}
      {processedTransactions.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--card-color)] flex items-center justify-center mb-4">
            <Network className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No transactions found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters or check back later
          </p>
        </div>
      )}

      {/* Transaction List */}
      <InfiniteScroll
        dataLength={processedTransactions.length}
        next={fetchNextPage}
        hasMore={!!hasNextPage}
        loader={
          <div className="flex justify-center py-4">
            <TabsLoading />
          </div>
        }
        endMessage={
          processedTransactions.length > 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              <b>You&apos;ve seen all transactions</b>
            </p>
          ) : null
        }
        className="space-y-4"
      >
        {groupedTransactions.map(group => (
          <div key={group.date} className="space-y-2">
            {/* Date Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm py-2 px-1 z-10">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {group.date}
              </h3>
            </div>

            {/* Transactions for this date */}
            {group.transactions.map((tx, index) => {
              // Get method display info with 3 color categories
              const getMethodInfo = (method: string) => {
                switch (method) {
                  case 'swap':
                    return {
                      label: 'Swapped',
                      color: 'text-blue-400',
                      icon: ArrowUp,
                    };
                  case 'send':
                    return {
                      label: 'Sent',
                      color: 'text-red-400',
                      icon: ArrowUp,
                    };
                  case 'withdraw':
                    return {
                      label: 'Withdrew',
                      color: 'text-red-400',
                      icon: ArrowUp,
                    };
                  case 'deposit':
                    return {
                      label: 'Deposited',
                      color: 'text-green-400',
                      icon: ArrowDown,
                    };
                  case 'receive':
                    return {
                      label: 'Received',
                      color: 'text-green-400',
                      icon: ArrowDown,
                    };
                  default:
                    return {
                      label: 'Sent',
                      color: 'text-red-400',
                      icon: ArrowUp,
                    };
                }
              };

              const methodInfo = getMethodInfo(tx.method);
              const MethodIcon = methodInfo.icon;

              return (
                <div
                  key={`${tx.hash}-${index}`}
                  className="flex items-center gap-3 p-4 rounded-lg hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer"
                  onClick={() =>
                    openDialog(<HistoryDetailDialog transaction={tx} />)
                  }
                >
                  {/* Special UI for Swap transactions */}
                  {tx.method === 'swap' && tx.outputTokenInfo ? (
                    <div className="flex items-center relative mr-4 pb-4">
                      {/* Input Token Icon */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary-color)]/10 relative">
                        {tx.tokenInfo?.symbol === 'LOADING' ? (
                          <div className="w-2 h-2 border border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <TokenLogo
                            symbol={tx.tokenInfo?.symbol || 'UNKNOWN'}
                            existingLogo={tx.tokenInfo?.logo}
                            networkId={getChainType(tx.chainId)}
                            tokenAddress={tx.tokenInfo?.address}
                            className="w-8 h-8 rounded-full"
                            fallbackText={
                              tx.tokenInfo?.symbol?.charAt(0) || 'T'
                            }
                          />
                        )}
                      </div>

                      {/* Output Token Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary-color)]/10 absolute top-3 left-3">
                        {tx.outputTokenInfo?.symbol === 'LOADING' ? (
                          <div className="w-2 h-2 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <TokenLogo
                            symbol={tx.outputTokenInfo?.symbol || 'UNKNOWN'}
                            existingLogo={tx.outputTokenInfo?.logo}
                            networkId={getChainType(tx.chainId)}
                            tokenAddress={tx.outputTokenInfo?.address}
                            className="w-8 h-8 rounded-full"
                            fallbackText={
                              tx.outputTokenInfo?.symbol?.charAt(0) || 'T'
                            }
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Regular UI for non-swap transactions */
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary-color)]/10 relative me-1">
                      {tx.isTokenTransfer ? (
                        tx.tokenInfo?.symbol === 'LOADING' ? (
                          <div className="w-3 h-3 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <TokenLogo
                            symbol={tx.tokenInfo?.symbol || 'UNKNOWN'}
                            existingLogo={tx.tokenInfo?.logo}
                            networkId={getChainType(tx.chainId)}
                            tokenAddress={tx.tokenInfo?.address}
                            className="w-10 h-10 rounded-full"
                            fallbackText={
                              tx.tokenInfo?.symbol?.charAt(0) || 'T'
                            }
                          />
                        )
                      ) : (
                        // ETH icon
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center font-bold text-blue-600 text-sm border border-blue-500/20">
                          <TokenLogo
                            symbol={'eth'}
                            className="w-8 h-8 rounded-full"
                            fallbackText={'T'}
                          />
                        </div>
                      )}

                      {/* Method indicator */}
                      <div
                        className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          tx.method === 'swap'
                            ? 'bg-blue-400'
                            : tx.method === 'send' || tx.method === 'withdraw'
                              ? 'bg-red-400'
                              : tx.method === 'receive' ||
                                  tx.method === 'deposit'
                                ? 'bg-green-400'
                                : 'bg-red-400'
                        }`}
                      >
                        <MethodIcon
                          className="w-2.5 h-2.5 text-white"
                          strokeWidth={3}
                        />
                      </div>
                    </div>
                  )}

                  {/* Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 relative">
                      <p
                        className={`font-semibold text-sm ${methodInfo.color}`}
                      >
                        {methodInfo.label}
                      </p>
                    </div>

                    {/* Token/Asset name - Special handling for swaps */}
                    {tx.method === 'swap' && tx.outputTokenInfo ? (
                      <p className="text-sm font-medium text-foreground mb-1">
                        {tx.tokenInfo?.symbol === 'LOADING' ||
                        tx.outputTokenInfo?.symbol === 'LOADING'
                          ? 'Loading swap info...'
                          : `${tx.tokenInfo?.symbol || 'Unknown'} → ${tx.outputTokenInfo?.symbol || 'Unknown'}`}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-foreground mb-1">
                        {tx.isTokenTransfer && tx.tokenInfo
                          ? tx.tokenInfo.symbol === 'LOADING'
                            ? 'Loading token info...'
                            : `${tx.tokenInfo.symbol} (${tx.tokenInfo.name})`
                          : 'Ethereum (ETH)'}
                      </p>
                    )}

                    {/* Transaction time only */}
                    <p className="text-xs text-muted-foreground">
                      {new Date(
                        parseInt(tx.timeStamp) * 1000
                      ).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex flex-col items-end">
                    {tx.method === 'swap' && tx.outputTokenInfo ? (
                      /* Special swap amount display */
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-red-400">
                          -
                          {tx.tokenAmount &&
                          tx.tokenInfo &&
                          tx.tokenInfo.symbol !== 'LOADING'
                            ? `${formatTokenAmount(tx.tokenAmount, tx.tokenInfo.decimals)} ${tx.tokenInfo.symbol}`
                            : tx.tokenInfo?.symbol === 'LOADING'
                              ? 'Loading...'
                              : `${formatValue(tx.value)} ETH`}
                        </p>
                        <p className="font-semibold text-sm text-green-400">
                          +
                          {tx.outputTokenAmount &&
                          tx.outputTokenInfo &&
                          tx.outputTokenInfo.symbol !== 'LOADING'
                            ? `${formatTokenAmount(tx.outputTokenAmount, tx.outputTokenInfo.decimals)} ${tx.outputTokenInfo.symbol}`
                            : tx.outputTokenInfo?.symbol === 'LOADING'
                              ? 'Loading...'
                              : 'Unknown'}
                        </p>
                      </div>
                    ) : (
                      /* Regular amount display */
                      <p
                        className={`font-semibold text-sm ${methodInfo.color}`}
                      >
                        {tx.method === 'send' || tx.method === 'withdraw'
                          ? '-'
                          : tx.method === 'receive' || tx.method === 'deposit'
                            ? '+'
                            : ''}
                        {tx.isTokenTransfer &&
                        tx.tokenAmount &&
                        tx.tokenInfo &&
                        tx.tokenInfo.symbol !== 'LOADING'
                          ? `${formatTokenAmount(tx.tokenAmount, tx.tokenInfo.decimals)} ${tx.tokenInfo.symbol}`
                          : tx.isTokenTransfer &&
                              tx.tokenInfo?.symbol === 'LOADING'
                            ? 'Loading...'
                            : `${formatValue(tx.value)} ETH`}
                      </p>
                    )}
                    {/* Chain badge */}
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {tx.chainName}
                      </p>
                      <div className="w-5 h-5 rounded-full bg-[var(--background-color)] flex items-center justify-center">
                        {getChainIcon(tx.chainName) ? (
                          <img
                            src={getChainIcon(tx.chainName)!}
                            alt={tx.chainName}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <Network className="w-2 h-2 text-[var(--primary-color)]" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default History;
