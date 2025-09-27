export interface GluexRequest {
  // Identifiers
  chainID?: string; // Conditional: target chain identifier (e.g., "ethereum")
  networkID?: string | number; // Conditional: numerical chain ID (e.g., 1)

  // Tokens
  inputToken: string; // Required: ERC20 token address to be sold
  outputToken: string; // Required: ERC20 token address to be bought

  // Amounts (one of inputAmount or outputAmount required based on orderType)
  inputAmount?: string | number; // Conditional: for SELL orders (wei string or number)
  outputAmount?: string | number; // Conditional: for BUY orders (wei string or number)

  // Order
  orderType?: 'BUY' | 'SELL'; // Conditional: type of order

  // Addresses
  userAddress: string; // Required: initiator wallet
  outputReceiver: string; // Required: receiver of output token
  uniquePID: string; // Required: Partner ID for analytics/attribution

  // Execution flags
  computeEstimate?: boolean; // Optional (default true): enable simulation
  computeStable?: boolean; // Optional (default false): include USD value metadata
  surgeProtection?: boolean; // Optional (default false)
  isPartialFill?: boolean; // Optional (default false)
  isPermit2?: boolean; // Optional (default false): use Permit2 for approvals

  // Tolerances and fees
  slippage?: string | number; // Optional: basis points
  partnerFee?: string | number; // Optional (default 0): fee in bps applied to output
  partnerAddress?: string; // Conditional: EOA to receive partner fee and surplus

  // Routing controls
  modulesFilter?: string[]; // Optional (default []): restrict to specified liquidity modules
  modulesDisabled?: string[]; // Optional (default []): disable specified liquidity modules
  activateSurplusFee?: boolean; // Optional (default false): enable surplus sharing contract
}

export interface GluexQuoteResult {
  inputToken: string; // ERC20 address of input token
  outputToken: string; // ERC20 address of output token
  feeToken: string; // Token used to pay any applicable fees
  inputSender: string; // Address initiating the trade
  outputReceiver: string; // Address receiving the output
  inputAmount: string; // Original input amount
  outputAmount: string; // Expected output amount
  partnerFee: string; // Amount of fee allocated to partner
  routingFee: string; // GlueX's routing fee (typically zero)
  effectiveInputAmount: string; // Actual used input in the swap (for partial fills)
  effectiveOutputAmount: string; // Actual received output after fees and routing
  minOutputAmount: string; // Slippage-protected minimum output
  liquidityModules: string[]; // Liquidity sources/modules used
  router: string; // Router contract address
  estimatedNetSurplus: string; // Estimated net surplus
  calldata: string; // ABI encoded transaction data
  isNativeTokenInput: boolean; // Whether native token (e.g., ETH) was used as input
  value: string; // Value (in wei) sent with transaction (if applicable)
  revert: boolean; // Indicates if trade would revert onchain
  computationUnits: number; // Computational units limit (fixed at 2000000)
  blockNumber: number; // Block number used during simulation
  lowBalance: boolean; // True if user balance is insufficient
  inputAmountUSD: string | null; // USD value of input amount
  effectiveInputAmountUSD: string | null; // USD value of effective input amount
  outputAmountUSD: string | null; // USD value of output amount
  effectiveOutputAmountUSD: string | null; // USD value of effective output amount
}

export interface GluexResponse {
  statusCode: number;
  result: GluexQuoteResult;
}
