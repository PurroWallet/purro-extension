export interface HyperliquidToken {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  isCanonical: boolean;
  evmContract: {
    address: string;
    evm_extra_wei_decimals: number;
  } | null;
  fullName: string | null;
}

export interface UniverseItem {
  name: string;
  tokens: number[];
  index: number;
  isCanonical: boolean;
}

export interface PriceData {
  dayNtlVlm: string;
  markPx: string;
  midPx: string;
  prevDayPx: string;
}

export interface HyperliquidSpotMetaData {
  tokens: HyperliquidToken[];
  universe: UniverseItem[];
}

// Kiểu dữ liệu cho response từ API
export type HyperliquidApiSpotAssetContext = [
  HyperliquidSpotMetaData,
  PriceData[],
];

export interface PriceInfo {
  markPrice: number;
  midPrice: number;
  previousDayPrice: number;
  dayVolume: number;
}

export interface SpotInfo {
  symbol: string;
  tokenId: string;
  universe: string | null;
  price: number | null;
  priceInfo: PriceInfo | null;
}

export interface SpotInfoResult {
  [symbol: string]: SpotInfo;
}

export interface Balance {
  coin: string;
  token: number;
  hold: string;
  total: string;
  entryNtl: string;
}

export interface BalanceResponse {
  balances: Balance[];
}

export interface UserBalance {
  coin: string;
  token: number;
  hold: number;
  total: number;
  entryNtl: number;
  tokenInfo?: HyperliquidToken;
  universe?: string;
  currentPrice?: number;
  marketValue?: number;
}

export interface PnLData {
  pnl: number;
  pnlPercentage: number;
}

export interface BalanceDisplay {
  coin: string;
  total: string;
  marketValue: string;
  pnl: string;
  pnlPercentage: string;
}

export interface SpotTokenDetails {
  name: string;
  maxSupply: string;
  totalSupply: string;
  circulatingSupply: string;
  szDecimals: number;
  weiDecimals: number;
  midPx: string;
  markPx: string;
  prevDayPx: string;
  genesis: {
    userBalances: string[][];
    existingTokenBalances: [];
  };
  deployer: string;
  deployGas: string;
  deployTime: string;
  seededUsdc: string;
  nonCirculatingUserBalances: [];
  futureEmissions: string;
}

export interface HLCandleSnapshot {
  T: number;
  c: string;
  h: string;
  i: string;
  l: string;
  n: number;
  o: string;
  s: string;
  t: number;
  v: string;
}
