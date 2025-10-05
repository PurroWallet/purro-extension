import { ChainTypeClient } from '@/types/wallet';

// Chain ID mapping for supported networks
export const CHAIN_IDS = {
  hyperevm: 999, // HyperEVM
  ethereum: 1, // Ethereum mainnet
  arbitrum: 42161, // Arbitrum One
  base: 8453, // Base mainnet
} as const;

export type ChainFilter = ChainTypeClient | 'all';

// Chain filter options for display
export const CHAIN_FILTER_OPTIONS: Array<{
  value: ChainFilter;
  label: string;
  chainId: number;
}> = [
  { value: 'all', label: 'All Chains', chainId: 0 },
  { value: 'hyperevm', label: 'HyperEVM', chainId: CHAIN_IDS.hyperevm },
  { value: 'ethereum', label: 'Ethereum', chainId: CHAIN_IDS.ethereum },
  { value: 'arbitrum', label: 'Arbitrum', chainId: CHAIN_IDS.arbitrum },
  { value: 'base', label: 'Base', chainId: CHAIN_IDS.base },
];

// Common ABI fragments for decoding transaction data
export const COMMON_FUNCTION_ABIS = [
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
  'function uniswap(address srcToken, uint256 amount, uint256 minReturn, uint256[] calldata pools)',

  // Custom DEX aggregator functions
  // Swap struct: (address tokenIn, address tokenOut, uint8 routerIndex, uint24 fee, uint256 amountIn, bool stable)
  'function executeSwaps(address[] calldata tokens, uint256 amountIn, uint256 minAmountOut, uint256 expectedAmountOut, tuple[][] calldata hopSwaps, uint256 feeBps, address feeRecipient)',

  // GlueX swap functions (method ID: 0x57eb8db4)
  // Official GlueX Router swap function with accurate tuple structure
  // desc: complete swap description with tokens, amounts, fees, surplus, and slippage shares
  // interactions: array of contract calls to execute the multi-step swap
  'function swap(address executor, (address inputToken, address outputToken, address inputReceiver, address outputReceiver, address partnerAddress, uint256 inputAmount, uint256 outputAmount, uint256 partnerFee, uint256 routingFee, uint256 partnerSurplusShare, uint256 protocolSurplusShare, uint256 partnerSlippageShare, uint256 protocolSlippageShare, uint256 effectiveOutputAmount, uint256 minOutputAmount, bool isPermit2, bytes32 uniquePID) desc, (address target, uint256 value, bytes callData)[] interactions)',
] as const;
