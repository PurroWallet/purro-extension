export interface SwapRouteV2Request {
  tokenIn: string;
  tokenOut: string;
  amountIn?: number;
  amountOut?: number;
  multiHop?: boolean;
  slippage?: number;
  unwrapWHYPE?: boolean;
  excludeDexes?: string;
  feeBps?: number;
  feeRecipient?: string;
}

export interface SwapRouteV2Response {
  success: boolean;
  tokens: {
    tokenIn: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
    tokenOut: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
    intermediates?: Array<{
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    }>;
  };
  amountIn: string;
  amountOut: string;
  averagePriceImpact: string;
  execution: {
    to: string;
    calldata: string;
    details: {
      path: string[];
      amountIn: string;
      amountOut: string;
      minAmountOut: string;
      feeBps?: number;
      feeRecipient?: string;
      feePercentage?: string;
      hopSwaps: Array<
        Array<{
          tokenIn: string;
          tokenOut: string;
          routerIndex: number;
          routerName: string;
          fee: number;
          amountIn: string;
          amountOut: string;
          stable: boolean;
          priceImpact: string;
        }>
      >;
    };
  } | null;
}

export interface FetchTokenRequest {
  limit?: number;
  search?: string;
  metadata?: boolean;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  transfers24h: number;
}

export interface FetchTokenResponse {
  success: boolean;
  data: {
    tokens: Token[];
    count: number;
    limitedCount: number;
    searchApplied: boolean;
    limitApplied: boolean;
    serviceStatus: string;
    lastProcessedBlock: string;
  };
}

export interface FetchBalancesRequest {
  wallet: string;
  limit?: number;
}

export interface Balance {
  token: string;
  balance: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface FetchBalancesResponse {
  success: boolean;
  data: {
    wallet: string;
    tokens: Balance[];
    count: number;
    limitedCount: number;
  };
}
