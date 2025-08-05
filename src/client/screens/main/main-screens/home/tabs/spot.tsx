import { useMemo } from "react";
import { HyperliquidApiSpotAssetContext } from "@/client/types/hyperliquid-api";
import { useHlPortfolioData } from "@/client/hooks/use-hyperliquid-portfolio";
import { formatCurrency } from "@/client/utils/formatters";
import HyperLiquidSpotDataIndexer from "@/client/lib/spot-data-indexer";
import TabsLoading from "./tabs-loading";
import TabsError from "./tabs-error";
import useNetworkSettingsStore from "@/client/hooks/use-network-store";
import { getSpotTokenImage } from "@/client/utils/icons";

const WalletTabsSpot = () => {
  const { isHyperliquidDexEnabled } = useNetworkSettingsStore();

  const { spotData, isSpotLoading, spotError } = useHlPortfolioData({
    fetchSpot: isHyperliquidDexEnabled, // Only fetch if Hyperliquid DEX is enabled
    fetchPerps: false,
    fetchEvm: false,
  });

  // Create indexer only when dataContext is available
  const indexer = useMemo(() => {
    if (
      !isHyperliquidDexEnabled ||
      !spotData?.context ||
      !Array.isArray(spotData.context) ||
      spotData.context.length < 2
    ) {
      return null;
    }
    try {
      return new HyperLiquidSpotDataIndexer(
        spotData.context as HyperliquidApiSpotAssetContext
      );
    } catch (error) {
      console.error("Error creating SpotDataIndexer:", error);
      return null;
    }
  }, [isHyperliquidDexEnabled, spotData?.context]);

  // Process user balances only when both data sources are available
  const userBalances = useMemo(() => {
    if (!isHyperliquidDexEnabled || !indexer || !spotData?.balances) {
      return [];
    }
    // Get user balances and sort by market value from highest to lowest
    const balances = spotData.balances;
    return balances.sort((a, b) => {
      const valueA = a.marketValue || 0;
      const valueB = b.marketValue || 0;
      return valueB - valueA; // Sort descending (highest to lowest)
    });
  }, [isHyperliquidDexEnabled, indexer, spotData?.balances]);

  // Calculate portfolio value using the indexer
  const portfolioValue = useMemo(() => {
    if (!isHyperliquidDexEnabled || !userBalances.length) return 0;
    return indexer?.getPortfolioValue(userBalances) || 0;
  }, [isHyperliquidDexEnabled, userBalances, indexer]);

  // Handle loading state
  if (isSpotLoading) {
    return <TabsLoading />;
  }

  // Handle error state
  if (spotError) {
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
            Hyperliquid DEX (Spot trading) is currently disabled. Enable it in
            the header or settings to view your spot positions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* Account Summary */}
      <div className="mb-2">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Spot Balance</div>
            <div className="font-semibold text-lg">
              {formatCurrency(portfolioValue)}
            </div>
          </div>
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Assets</div>
            <div className="font-semibold text-lg">{userBalances.length}</div>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <>
        {userBalances.length > 0 ? (
          <div className="space-y-2 overflow-visible">
            {userBalances.map((balance, index) => (
              <SpotItem
                key={index + balance.coin}
                name={balance.coin}
                symbol={balance.coin}
                balance={balance.total}
                value={balance.marketValue || 0}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--card-color)] text-muted-foreground rounded-lg p-3 text-center">
            No assets found
          </div>
        )}
      </>
    </div>
  );
};

interface SpotItemProps {
  name: string;
  symbol: string;
  balance: number;
  value: number;
  onClick?: () => void;
  className?: string;
}

export const SpotItem = ({
  name,
  symbol,
  balance,
  value,
  onClick,
  className,
}: SpotItemProps) => {
  return (
    <div
      className={`bg-[var(--card-color)] rounded-lg p-3 flex items-center gap-3 ${className}`}
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        <div className="size-12 flex items-center justify-center rounded-full bg-[var(--primary-color)]/10 overflow-hidden">
          <img
            src={getSpotTokenImage(symbol)}
            alt={symbol}
            className="size-full rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallbackDiv = document.createElement("div");
                fallbackDiv.className =
                  "size-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-lg border border-[var(--primary-color)]/20";
                fallbackDiv.textContent = symbol.charAt(0).toUpperCase();
                parent.insertBefore(fallbackDiv, e.currentTarget);
              }
            }}
          />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <div>
          <div className="truncate font-semibold text-lg">{name}</div>
          <div className="text-muted-foreground mt-0.5 truncate text-sm">
            {balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{" "}
            {symbol}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-semibold text-lg">{formatCurrency(value)}</div>
        </div>
      </div>
    </div>
  );
};

export default WalletTabsSpot;
