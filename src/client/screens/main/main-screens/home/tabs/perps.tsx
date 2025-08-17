import { useHlPortfolioData } from '@/client/hooks/use-hyperliquid-portfolio';
import { formatCurrency } from '@/client/utils/formatters';
import TabsLoading from './tabs-loading';
import TabsError from './tabs-error';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import { Button } from '@/client/components/ui';
import { DepositHyperDexDrawer } from '@/client/components/drawers/deposit-hyperdex-drawer';
import useDrawerStore from '@/client/hooks/use-drawer-store';
import useWalletStore from '@/client/hooks/use-wallet-store';

// Define types for position data
interface Position {
  coin: string;
  cumFunding: {
    allTime: string;
    sinceChange: string;
    sinceOpen: string;
  };
  entryPx: string;
  leverage: {
    rawUsd: string;
    type: string;
    value: number;
  };
  liquidationPx: string;
  marginUsed: string;
  maxLeverage: number;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

interface AssetPosition {
  position: Position;
  type: string;
}

const WalletTabsPerps = () => {
  const { isHyperliquidDexEnabled } = useNetworkSettingsStore();
  const { openDrawer } = useDrawerStore();
  const { activeAccount } = useWalletStore();

  const isWatchOnly = activeAccount?.source === 'watchOnly';

  const { perpsData, isPerpsLoading, perpsError } = useHlPortfolioData({
    fetchSpot: false,
    fetchPerps: isHyperliquidDexEnabled,
    fetchEvm: false,
  });

  if (isPerpsLoading) {
    return <TabsLoading />;
  }

  if (perpsError) {
    return <TabsError />;
  }

  // Handle disabled state
  if (!isHyperliquidDexEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <div className="text-muted-foreground mb-2">
          <div className="size-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-500 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Hyperliquid DEX Disabled
          </h3>
          <p className="text-sm">
            Hyperliquid DEX (Perpetuals trading) is currently disabled. Enable
            it in the header or settings to view your perpetual positions.
          </p>
        </div>
      </div>
    );
  }

  const isLong = (szi: string) => {
    return parseFloat(szi) > 0;
  };

  return (
    <div className="space-y-6 p-2">
      {/* <div className='absolute top-2 right-2 z-10'>
                <RefreshTimer onRefresh={refetch} />
            </div> */}

      {/* Account Summary */}
      <div className="mb-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Account Value</div>
            <div className="font-semibold text-lg flex items-center gap-2">
              {formatCurrency(
                parseFloat(perpsData?.marginSummary?.accountValue || '0')
              )}
              {!isWatchOnly && (
                <Button
                  variant="secondary"
                  className="text-xs p-0 text-[var(--primary-color-light)]"
                  onClick={() => {
                    openDrawer(<DepositHyperDexDrawer />);
                  }}
                >
                  Transfer
                </Button>
              )}
            </div>
          </div>
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Margin Used</div>
            <div className="font-semibold text-lg">
              {formatCurrency(
                parseFloat(perpsData?.marginSummary?.totalMarginUsed || '0')
              )}
            </div>
          </div>
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Total Position</div>
            <div className="font-semibold text-lg">
              {formatCurrency(
                parseFloat(perpsData?.marginSummary?.totalNtlPos || '0')
              )}
            </div>
          </div>
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Withdrawable</div>
            <div className="font-semibold text-lg">
              {formatCurrency(parseFloat(perpsData?.withdrawable || '0'))}
            </div>
          </div>
        </div>
      </div>

      {/* Positions */}
      <>
        {perpsData?.assetPositions && perpsData.assetPositions.length > 0 ? (
          <div className="space-y-2 overflow-visible">
            {perpsData.assetPositions
              .sort(
                (a: AssetPosition, b: AssetPosition) =>
                  parseFloat(b.position.positionValue) -
                  parseFloat(a.position.positionValue)
              )
              .map((asset: AssetPosition, index: number) => (
                <div
                  key={index}
                  className="bg-[var(--card-color)] rounded-lg p-3"
                >
                  <div className="mb-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 overflow-hidden text-white w-fit">
                        <div className="truncate font-semibold text-lg">
                          {asset.position.coin}
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold  ${
                            isLong(asset.position.szi)
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {isLong(asset.position.szi) ? 'Long' : 'Short'}
                        </div>
                      </div>
                      <div className="text-muted-foreground text-xs capitalize text-gray-300">
                        {asset.position.leverage.type} x
                        {asset.position.leverage.value}
                      </div>
                    </div>

                    <div
                      className={`font-semibold text-lg ${
                        parseFloat(asset.position.unrealizedPnl) >= 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      <p className="text-muted-foreground text-xs text-right text-gray-300">
                        PnL
                      </p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(
                          parseFloat(asset.position.unrealizedPnl)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-muted-foreground text-xs text-gray-300">
                        Size
                      </p>
                      <p className="font-semibold text-base">
                        {formatCurrency(
                          parseFloat(asset.position.szi),
                          2,
                          '',
                          false
                        )}
                        {asset.position.coin}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs text-gray-300">
                        Value
                      </p>
                      <p className="font-semibold text-base">
                        {formatCurrency(
                          parseFloat(asset.position.positionValue)
                        )}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-muted-foreground text-xs text-gray-300">
                        Entry Price
                      </p>
                      <p className="font-semibold text-base">
                        {formatCurrency(parseFloat(asset.position.entryPx))}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-muted-foreground text-xs text-gray-300">
                        Margin Used
                      </p>
                      <p className="font-semibold text-base">
                        {formatCurrency(parseFloat(asset.position.marginUsed))}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-muted-foreground text-xs text-gray-300">
                        Liquidation Price
                      </p>

                      <p className="font-semibold text-base">
                        {formatCurrency(
                          parseFloat(asset.position.liquidationPx)
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs text-gray-300">
                        Funding
                      </p>
                      <p className="font-semibold text-base">
                        {formatCurrency(
                          -parseFloat(asset.position.cumFunding.sinceOpen)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      className="w-1/2 bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color)]/80 text-white py-2 text-sm"
                      onClick={() => {
                        window.open(
                          `https://app.hyperliquid.xyz/trade/${asset.position.coin}`
                        );
                      }}
                    >
                      Trade
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-[var(--card-color)] text-muted-foreground rounded-lg p-3 text-center">
            No open positions
          </div>
        )}
      </>
    </div>
  );
};

export default WalletTabsPerps;
