import { ArrowDown, ArrowUp, Filter, Network } from 'lucide-react';
import TabsLoading from '../home/tabs/tabs-loading';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { truncateAddress } from '@/client/utils/formatters';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { useInfiniteTransactions } from '@/client/hooks/use-etherscan-transactions';
import { useState, useMemo } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import type { EtherscanTransaction, MultiChainTransactionPage, ChainTransactionResult } from '@/client/types/etherscan-api';
import { NETWORK_ICONS } from '@/utils/network-icons';
import HistoryDetailDialog from './history-detail-dialog';
import { ENDPOINTS } from '@/client/services/endpoints';
import { ethers } from 'ethers';

// Chain ID mapping for supported networks
const CHAIN_IDS = {
  hyperevm: 999, // HyperEVM
  ethereum: 1,   // Ethereum mainnet
  arbitrum: 42161, // Arbitrum One
  base: 8453,    // Base mainnet
} as const;

type ChainFilter = keyof typeof CHAIN_IDS | 'all';
type TransactionType = 'all' | 'send' | 'receive' | 'swap' | 'deposit' | 'withdraw' | 'approve' | 'contract';
type DateFilter = 'all' | '24h' | '7d' | '30d';

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
  method: 'send' | 'receive' | 'swap' | 'deposit' | 'withdraw' | 'approve' | 'contract' | 'unknown';
  tokenInfo?: TokenInfo;
  tokenAmount?: string;
  isTokenTransfer: boolean;
}

// Common ABI fragments for decoding transaction data
const COMMON_FUNCTION_ABIS = [
  // ERC20 functions
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)",

  // Uniswap V2 functions
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)",
  "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)",

  // Liquidity functions
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline)",

  // WETH functions
  "function deposit()",
  "function withdraw(uint256 amount)",

  // Uniswap V3 functions
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96))",
  "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96))",

  // Common DEX aggregator functions
  "function swap(address caller, (address srcToken, address dstToken, address srcReceiver, address dstReceiver, uint256 amount, uint256 minReturnAmount, uint256 flags) desc, bytes permit, bytes data)",
  "function unoswap(address srcToken, uint256 amount, uint256 minReturn, uint256[] calldata pools)",
];

// Create ethers interface for decoding
const commonInterface = new ethers.Interface(COMMON_FUNCTION_ABIS);

// Function to decode transaction input data
const decodeTransactionData = (inputData: string): { name: string; args?: any[] } | null => {
  if (!inputData || inputData === '0x' || inputData.length < 10) {
    return null;
  }

  try {
    const decoded = commonInterface.parseTransaction({ data: inputData });
    return {
      name: decoded.name,
      args: decoded.args
    };
  } catch (error) {
    // If we can't decode with common ABIs, try to extract just the method signature
    const methodId = inputData.slice(0, 10);
    console.log(`Unknown function signature: ${methodId}`);
    return null;
  }
};

// Helper function to analyze transaction method using dynamic decoding
const analyzeTransactionMethod = (tx: EtherscanTransaction, userAddress: string): {
  method: TransactionWithChain['method'];
  isTokenTransfer: boolean;
} => {
  const input = tx.input;
  const isFromUser = tx.from.toLowerCase() === userAddress.toLowerCase();

  // Check if it's a simple ETH transfer
  if (!input || input === '0x') {
    return {
      method: isFromUser ? 'send' : 'receive',
      isTokenTransfer: false
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
          isTokenTransfer: true
        };

      case 'approve':
        return {
          method: 'approve',
          isTokenTransfer: true
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
        return {
          method: 'swap',
          isTokenTransfer: true
        };

      case 'addliquidity':
      case 'addliquidityeth':
      case 'removeliquidity':
      case 'removeliquidityeth':
        return {
          method: functionName.includes('add') ? 'deposit' : 'withdraw',
          isTokenTransfer: true
        };

      case 'deposit':
        return {
          method: 'deposit',
          isTokenTransfer: true
        };

      case 'withdraw':
        return {
          method: 'withdraw',
          isTokenTransfer: true
        };

      default:
        // For any other decoded function, it's a contract interaction
        return {
          method: 'contract',
          isTokenTransfer: true
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
        isTokenTransfer: true
      };
    }
  }

  // Default for contract interactions
  return {
    method: 'contract',
    isTokenTransfer: false
  };
};

// Get Alchemy endpoint for chain
const getAlchemyEndpoint = (chainId: number): string => {
  switch (chainId) {
    case 1: return ENDPOINTS.ALCHEMY_ETH_MAINNET;
    case 42161: return ENDPOINTS.ALCHEMY_ARB_MAINNET;
    case 8453: return ENDPOINTS.ALCHEMY_BASE_MAINNET;
    default: return ENDPOINTS.ALCHEMY_ETH_MAINNET; // Default to Ethereum
  }
};

// Fast fetch token metadata using Alchemy API
const fetchTokenMetadata = async (
  tokenAddress: string,
  chainId: number,
  timeout: number = 3000
): Promise<TokenInfo> => {
  try {
    const endpoint = getAlchemyEndpoint(chainId);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [tokenAddress],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`API error: ${data.error.message}`);
    }

    const result = data.result;
    return {
      address: tokenAddress,
      name: result?.name || 'Unknown Token',
      symbol: result?.symbol || 'UNKNOWN',
      decimals: result?.decimals || 18,
      logo: result?.logo || undefined,
    };
  } catch (error) {
    // Fast fallback - no retry, no logging spam
    console.warn(`Failed to fetch token metadata for ${tokenAddress}:`, error);
    return {
      address: tokenAddress,
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
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
const extractTokenInfoFromTransaction = (tx: EtherscanTransaction): {
  tokenAddress?: string;
  tokenAmount?: string;
} => {
  if (!tx.input || tx.input === '0x') return {};

  const decodedData = decodeTransactionData(tx.input);
  if (!decodedData || !decodedData.args) return {};

  const functionName = decodedData.name.toLowerCase();
  const args = decodedData.args;

  try {
    switch (functionName) {
      case 'transfer':
        // transfer(address to, uint256 amount)
        return {
          tokenAddress: tx.to, // The contract being called
          tokenAmount: args[1]?.toString() || '0'
        };

      case 'transferfrom':
        // transferFrom(address from, address to, uint256 amount)
        return {
          tokenAddress: tx.to, // The contract being called
          tokenAmount: args[2]?.toString() || '0'
        };

      case 'approve':
        // approve(address spender, uint256 amount)
        return {
          tokenAddress: tx.to, // The contract being called
          tokenAmount: args[1]?.toString() || '0'
        };

      default:
        // For other functions, we might not be able to extract specific token info
        return {
          tokenAddress: tx.to // At least we know the contract address
        };
    }
  } catch (error) {
    console.warn('Error extracting token info from transaction:', error);
    return {
      tokenAddress: tx.to
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
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Get active chain IDs based on filter
  const activeChainIds = useMemo(() => {
    if (chainFilter === 'all') {
      return Object.values(CHAIN_IDS);
    }
    return [CHAIN_IDS[chainFilter]];
  }, [chainFilter]);

  // Fetch transactions using the new hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error,
  } = useInfiniteTransactions(address || '', activeChainIds, {
    enabled: !!address,
    sort: 'desc', // Most recent first
    offset: 100,
  });

  // Token metadata cache to avoid repeated API calls
  const [tokenMetadataCache, setTokenMetadataCache] = useState<Map<string, TokenInfo>>(new Map());

  // Process and filter transactions
  const processedTransactions = useMemo(() => {
    if (!data || !address) return [];

    const allTransactions: TransactionWithChain[] = [];

    // Flatten all transactions from all pages and chains
    // Handle both possible data structures from useInfiniteQuery
    const pages = 'pages' in data ? data.pages : data;
    if (Array.isArray(pages)) {
      pages.forEach((page: MultiChainTransactionPage) => {
        page.results.forEach((result: ChainTransactionResult) => {
          result.transactions.forEach((tx: EtherscanTransaction) => {
            const chainName = Object.keys(CHAIN_IDS).find(
              key => CHAIN_IDS[key as keyof typeof CHAIN_IDS] === result.chainId
            ) || 'unknown';

            const type: 'send' | 'receive' =
              tx.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive';

            // Analyze transaction to get method and token info
            const analysis = analyzeTransactionMethod(tx, address);

            // For token transfers, try to extract token info from transaction data
            let tokenInfo: TokenInfo | undefined;
            let tokenAmount: string | undefined;

            // Enhanced token detection
            const isTokenTx = analysis.isTokenTransfer || isLikelyTokenTransfer(tx);

            if (isTokenTx) {
              // Extract token information from decoded transaction data
              const extractedInfo = extractTokenInfoFromTransaction(tx);
              const tokenAddress = extractedInfo.tokenAddress || tx.to;

              if (tokenAddress) {
                // Check cache first
                const cacheKey = `${result.chainId}-${tokenAddress.toLowerCase()}`;
                tokenInfo = tokenMetadataCache.get(cacheKey);

                // If not in cache, create a placeholder and fetch async
                if (!tokenInfo) {
                  tokenInfo = {
                    address: tokenAddress,
                    name: 'Loading...',
                    symbol: 'LOADING',
                    decimals: 18,
                    logo: undefined,
                  };

                  // Fetch token metadata asynchronously
                  fetchTokenMetadata(tokenAddress, result.chainId).then((metadata) => {
                    setTokenMetadataCache(prev => new Map(prev.set(cacheKey, metadata)));
                  });
                }

                // Use extracted token amount if available, otherwise use ETH value
                if (extractedInfo.tokenAmount) {
                  tokenAmount = extractedInfo.tokenAmount;
                } else if (tx.value === '0' || tx.value === '') {
                  // For transactions where we can't extract the amount, show as unknown
                  tokenAmount = '0';
                } else {
                  tokenAmount = tx.value;
                }
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
            });
          });
        });
      });
    }

    // Apply filters
    let filtered = allTransactions;

    // Type filter - now uses method instead of just send/receive
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.method === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      const cutoff = {
        '24h': now - 24 * 60 * 60 * 1000,
        '7d': now - 7 * 24 * 60 * 60 * 1000,
        '30d': now - 30 * 24 * 60 * 60 * 1000,
      }[dateFilter];

      if (cutoff) {
        filtered = filtered.filter(tx =>
          parseInt(tx.timeStamp) * 1000 > cutoff
        );
      }
    }

    // Sort by timestamp (most recent first)
    return filtered.sort((a, b) =>
      parseInt(b.timeStamp) - parseInt(a.timeStamp)
    );
  }, [data, address, typeFilter, dateFilter, tokenMetadataCache]);
  // Helper function to format transaction value
  const formatValue = (value: string) => {
    const ethValue = parseFloat(value) / Math.pow(10, 18);
    return ethValue.toFixed(6);
  };

  // Helper function to format token amount based on decimals
  const formatTokenAmount = (amount: string, decimals: number = 18): string => {
    try {
      const numAmount = parseFloat(amount);
      const divisor = Math.pow(10, decimals);
      const formattedAmount = numAmount / divisor;

      // Format based on size
      if (formattedAmount === 0) return '0';
      if (formattedAmount < 0.0001) return formattedAmount.toExponential(2);
      if (formattedAmount < 1) return formattedAmount.toFixed(6);
      if (formattedAmount < 1000) return formattedAmount.toFixed(4);
      if (formattedAmount < 1000000) return (formattedAmount / 1000).toFixed(2) + 'K';
      return (formattedAmount / 1000000).toFixed(2) + 'M';
    } catch (error) {
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
        <p className="text-red-500">Error loading transactions: {error.message}</p>
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
          onChange={(e) => setChainFilter(e.target.value as ChainFilter)}
          className="px-3 py-1 rounded-lg bg-[var(--card-color)] border border-[var(--border-color)] text-sm"
        >
          <option value="all">All Chains</option>
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="base">Base</option>
          <option value="hyperevm">HyperEVM</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType)}
          className="px-3 py-1 rounded-lg bg-[var(--card-color)] border border-[var(--border-color)] text-sm"
        >
          <option value="all">All Types</option>
          <option value="send">Send</option>
          <option value="receive">Receive</option>
        </select>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="px-3 py-1 rounded-lg bg-[var(--card-color)] border border-[var(--border-color)] text-sm"
        >
          <option value="all">All Time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {/* No transactions message */}
      {processedTransactions.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--card-color)] flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
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
        className="space-y-2"
      >
        {processedTransactions.map((tx, index) => {
          // Get method display info
          const getMethodInfo = (method: string) => {
            switch (method) {
              case 'send': return { label: 'Sent', color: 'text-red-500', icon: ArrowUp };
              case 'receive': return { label: 'Received', color: 'text-green-500', icon: ArrowDown };
              case 'swap': return { label: 'Swapped', color: 'text-blue-500', icon: ArrowUp };
              case 'deposit': return { label: 'Deposited', color: 'text-purple-500', icon: ArrowDown };
              case 'withdraw': return { label: 'Withdrew', color: 'text-orange-500', icon: ArrowUp };
              case 'approve': return { label: 'Approved', color: 'text-yellow-500', icon: ArrowUp };
              case 'contract': return { label: 'Contract', color: 'text-gray-500', icon: Network };
              default: return { label: 'Unknown', color: 'text-gray-500', icon: Network };
            }
          };

          const methodInfo = getMethodInfo(tx.method);
          const MethodIcon = methodInfo.icon;

          return (
            <div
              key={`${tx.hash}-${index}`}
              className="flex items-center gap-3 p-4 rounded-lg bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer"
              onClick={() => openDialog(
                <HistoryDetailDialog transaction={tx} />
              )}
            >
              {/* Token/Asset Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary-color)]/10 relative">
                {tx.isTokenTransfer && tx.tokenInfo?.logo ? (
                  <img
                    src={tx.tokenInfo.logo}
                    alt={tx.tokenInfo.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : tx.isTokenTransfer ? (
                  // Token fallback icon with loading state
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 flex items-center justify-center font-bold text-[var(--primary-color)] text-sm border border-[var(--primary-color)]/20">
                    {tx.tokenInfo?.symbol === 'LOADING' ? (
                      <div className="w-3 h-3 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      tx.tokenInfo?.symbol?.charAt(0) || 'T'
                    )}
                  </div>
                ) : (
                  // ETH icon
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center font-bold text-blue-600 text-sm border border-blue-500/20">
                    ETH
                  </div>
                )}

                {/* Chain badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-white flex items-center justify-center">
                  {getChainIcon(tx.chainName) ? (
                    <img
                      src={getChainIcon(tx.chainName)!}
                      alt={tx.chainName}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <Network className="w-3 h-3 text-[var(--primary-color)]" />
                  )}
                </div>

                {/* Method indicator */}
                <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center ${
                  tx.method === 'send' || tx.method === 'withdraw' || tx.method === 'approve'
                    ? 'bg-red-500'
                    : tx.method === 'receive' || tx.method === 'deposit'
                    ? 'bg-green-500'
                    : tx.method === 'swap'
                    ? 'bg-blue-500'
                    : 'bg-gray-500'
                }`}>
                  <MethodIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              </div>

              {/* Transaction Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-semibold text-sm ${methodInfo.color}`}>
                    {methodInfo.label}
                  </p>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
                    {tx.chainName}
                  </span>
                </div>

                {/* Token/Asset name */}
                <p className="text-sm font-medium text-foreground mb-1">
                  {tx.isTokenTransfer && tx.tokenInfo
                    ? tx.tokenInfo.symbol === 'LOADING'
                      ? 'Loading token info...'
                      : `${tx.tokenInfo.symbol} (${tx.tokenInfo.name})`
                    : 'Ethereum (ETH)'
                  }
                </p>

                <p className="text-xs text-muted-foreground">
                  {tx.method === 'send' || tx.method === 'withdraw' || tx.method === 'approve' ? 'To' : 'From'} {truncateAddress(tx.method === 'send' || tx.method === 'withdraw' || tx.method === 'approve' ? tx.to : tx.from)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString()}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className={`font-semibold text-sm ${methodInfo.color}`}>
                  {tx.method === 'send' || tx.method === 'withdraw' || tx.method === 'approve' ? '-' : tx.method === 'receive' || tx.method === 'deposit' ? '+' : ''}
                  {tx.isTokenTransfer && tx.tokenAmount && tx.tokenInfo && tx.tokenInfo.symbol !== 'LOADING'
                    ? `${formatTokenAmount(tx.tokenAmount, tx.tokenInfo.decimals)} ${tx.tokenInfo.symbol}`
                    : tx.isTokenTransfer && tx.tokenInfo?.symbol === 'LOADING'
                    ? 'Loading...'
                    : `${formatValue(tx.value)} ETH`
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Block {tx.blockNumber}
                </p>
              </div>
            </div>
          );
        })}
      </InfiniteScroll>
    </div>
  );
};

export default History;
