import {
  HyperliquidToken,
  UniverseItem,
  HyperliquidSpotMetaData,
  PriceData,
  SpotInfoResult,
  BalanceResponse,
  UserBalance,
  PnLData,
  BalanceDisplay,
  HyperliquidApiSpotAssetContext,
} from '@/client/types/hyperliquid-api';

export default class SpotDataIndexer {
  private metaData: HyperliquidSpotMetaData;
  private priceData: PriceData[];
  private universeByName: Map<string, UniverseItem>;
  private tokensByName: Map<string, HyperliquidToken>;
  private tokensByIndex: Map<number, HyperliquidToken>;

  constructor(spotData: HyperliquidApiSpotAssetContext) {
    // Validate input
    if (!spotData || !Array.isArray(spotData) || spotData.length < 2) {
      throw new Error(
        'Invalid spot data format. Expected array with 2 elements.'
      );
    }

    if (!spotData[0] || !spotData[1] || !Array.isArray(spotData[1])) {
      throw new Error('Invalid spot data structure.');
    }

    this.metaData = spotData[0];
    this.priceData = spotData[1];
    this.universeByName = new Map();
    this.tokensByName = new Map();
    this.tokensByIndex = new Map();
    this._buildIndexes();
  }

  static isValidSpotData(
    data: unknown
  ): data is HyperliquidApiSpotAssetContext {
    return (
      data !== null &&
      typeof data === 'object' &&
      Array.isArray(data) &&
      data.length >= 2 &&
      data[0] &&
      data[1] &&
      Array.isArray(data[1]) &&
      data[0].tokens &&
      Array.isArray(data[0].tokens) &&
      data[0].universe &&
      Array.isArray(data[0].universe)
    );
  }

  private _buildIndexes(): void {
    // Validate metaData structure
    if (!this.metaData.universe || !Array.isArray(this.metaData.universe)) {
      console.warn('No universe data found in metaData');
      return;
    }

    if (!this.metaData.tokens || !Array.isArray(this.metaData.tokens)) {
      console.warn('No tokens data found in metaData');
      return;
    }

    this.metaData.universe.forEach(item => {
      this.universeByName.set(item.name.toUpperCase(), item);
    });

    this.metaData.tokens.forEach(token => {
      this.tokensByName.set(token.name.toUpperCase(), token);
      this.tokensByIndex.set(token.index, token);
    });
  }

  private getCoinIdentifier(
    coin: string,
    tokenInfo?: HyperliquidToken
  ): string | undefined {
    const upperCoin = coin.toUpperCase();

    // Special case for USDC
    if (upperCoin === 'USDC') {
      return 'USDC';
    }

    // Rule 1: PURR always uses PURR/USDC
    if (upperCoin === 'PURR') {
      return 'PURR/USDC';
    }

    // Rule 2: For other coins, find the universe index
    if (tokenInfo) {
      // Find universe that contains this token
      for (const item of this.universeByName.values()) {
        if (item.tokens.includes(tokenInfo.index)) {
          return `@${item.index}`;
        }
      }
    }

    // Fallback: try to find by coin name in universe
    for (const [universeName, item] of this.universeByName) {
      if (
        universeName.includes(upperCoin) ||
        universeName.includes(`${upperCoin}/`)
      ) {
        return `@${item.index}`;
      }
    }

    return undefined;
  }

  getSpotInfo(symbols: string[]): SpotInfoResult {
    const result: SpotInfoResult = {};

    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      const tokenInfo = this.tokensByName.get(upperSymbol);

      // Special case for USDC
      if (upperSymbol === 'USDC') {
        result[symbol] = {
          symbol,
          universe: 'USDC',
          price: 1.0, // USDC is pegged to $1
          tokenId: tokenInfo?.tokenId || '',
          priceInfo: {
            markPrice: 1.0,
            midPrice: 1.0,
            previousDayPrice: 1.0,
            dayVolume: 0, // No direct trading volume for USDC
          },
        };
        return;
      }

      // Get the correct coin identifier
      const coinIdentifier = this.getCoinIdentifier(symbol, tokenInfo);

      let universeIndex = -1;

      if (coinIdentifier === 'PURR/USDC') {
        const universeItem = this.universeByName.get('PURR/USDC');
        if (universeItem) {
          universeIndex = universeItem.index;
        }
      } else if (coinIdentifier && coinIdentifier.startsWith('@')) {
        // Extract index from @{index}
        universeIndex = parseInt(coinIdentifier.substring(1), 10);
      }

      const priceData =
        universeIndex >= 0 && this.priceData[universeIndex]
          ? this.priceData[universeIndex]
          : null;

      result[symbol] = {
        symbol,
        universe: coinIdentifier || null,
        tokenId: tokenInfo?.tokenId || '',
        price: priceData ? parseFloat(priceData.midPx) : null,
        priceInfo: priceData
          ? {
              markPrice: parseFloat(priceData.markPx),
              midPrice: parseFloat(priceData.midPx),
              previousDayPrice: parseFloat(priceData.prevDayPx),
              dayVolume: parseFloat(priceData.dayNtlVlm),
            }
          : null,
      };
    });

    return result;
  }

  processUserBalances(balanceResponse: BalanceResponse): UserBalance[] {
    if (!balanceResponse || !balanceResponse.balances) {
      return [];
    }

    return balanceResponse.balances.map(balance => {
      const tokenInfo = this.tokensByIndex.get(balance.token);
      const coin = balance.coin;
      const upperCoin = coin.toUpperCase();

      // Special handling for USDC
      if (upperCoin === 'USDC') {
        const totalAmount = parseFloat(balance.total);
        return {
          coin: balance.coin,
          token: balance.token,
          hold: parseFloat(balance.hold),
          total: totalAmount,
          entryNtl: parseFloat(balance.entryNtl),
          tokenInfo,
          universe: 'USDC',
          currentPrice: 1.0, // USDC price is always 1.0
          marketValue: totalAmount, // Market value is same as amount for USDC
        };
      }

      // Get the correct coin identifier based on Hyperliquid's rules
      const universe = this.getCoinIdentifier(coin, tokenInfo);

      let currentPrice: number | undefined = undefined;

      if (universe) {
        if (universe === 'PURR/USDC') {
          const universeItem = this.universeByName.get('PURR/USDC');
          if (universeItem) {
            const priceData = this.priceData[universeItem.index];
            currentPrice = priceData ? parseFloat(priceData.midPx) : undefined;
          }
        } else if (universe.startsWith('@')) {
          // Extract index from @{index}
          const universeIndex = parseInt(universe.substring(1), 10);
          const priceData = this.priceData[universeIndex];
          currentPrice = priceData ? parseFloat(priceData.midPx) : undefined;
        }
      }

      const totalAmount = parseFloat(balance.total);
      const marketValue =
        currentPrice && totalAmount ? currentPrice * totalAmount : undefined;

      return {
        coin: balance.coin,
        token: balance.token,
        hold: parseFloat(balance.hold),
        total: totalAmount,
        entryNtl: parseFloat(balance.entryNtl),
        tokenInfo,
        universe,
        currentPrice,
        marketValue,
      };
    });
  }

  getPortfolioValue(balances: UserBalance[]): number {
    return balances.reduce((total, balance) => {
      return total + (balance.marketValue ?? 0);
    }, 0);
  }

  getBalanceForCoin(
    balances: UserBalance[],
    coin: string
  ): UserBalance | undefined {
    return balances.find(
      balance => balance.coin.toUpperCase() === coin.toUpperCase()
    );
  }

  calculatePnL(balance: UserBalance): PnLData | null {
    if (!balance.marketValue || !balance.entryNtl || balance.entryNtl === 0) {
      return null;
    }

    const pnl = balance.marketValue - balance.entryNtl;
    const pnlPercentage = (pnl / balance.entryNtl) * 100;

    return { pnl, pnlPercentage };
  }

  getNonZeroBalances(balances: UserBalance[]): UserBalance[] {
    return balances.filter(balance => balance.total > 0);
  }

  formatBalanceDisplay(balance: UserBalance): BalanceDisplay {
    const pnlData = this.calculatePnL(balance);

    return {
      coin: balance.coin,
      total: balance.total.toFixed(balance.tokenInfo?.szDecimals ?? 8),
      marketValue: balance.marketValue?.toFixed(2) ?? 'N/A',
      pnl: pnlData ? pnlData.pnl.toFixed(2) : 'N/A',
      pnlPercentage: pnlData ? `${pnlData.pnlPercentage.toFixed(2)}%` : 'N/A',
    };
  }

  // Helper methods
  getAvailableUniverses(): string[] {
    return Array.from(this.universeByName.keys());
  }

  getUniverseByTokenIndex(
    tokenIndex: number
  ): { name: string; identifier: string } | undefined {
    // Special case for USDC
    const token = this.tokensByIndex.get(tokenIndex);
    if (token && token.name.toUpperCase() === 'USDC') {
      return {
        name: 'USDC',
        identifier: 'USDC',
      };
    }

    for (const [universeName, item] of this.universeByName) {
      if (item.tokens.includes(tokenIndex)) {
        return {
          name: universeName,
          identifier:
            universeName.toUpperCase() === 'PURR/USDC'
              ? 'PURR/USDC'
              : `@${item.index}`,
        };
      }
    }
    return undefined;
  }

  // Debug method to see the mapping
  getCoinToUniverseMapping(): Record<string, string> {
    const mapping: Record<string, string> = {};

    this.metaData.tokens.forEach(token => {
      // Special case for USDC
      if (token.name.toUpperCase() === 'USDC') {
        mapping[token.name] = 'USDC';
        return;
      }

      const identifier = this.getCoinIdentifier(token.name, token);
      if (identifier) {
        mapping[token.name] = identifier;
      }
    });

    return mapping;
  }
}
