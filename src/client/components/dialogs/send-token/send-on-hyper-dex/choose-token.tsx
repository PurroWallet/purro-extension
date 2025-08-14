import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { X } from 'lucide-react';
import useSendTokenHLStore from '@/client/hooks/use-send-token-HL-store';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import { useHlPortfolioData } from '@/client/hooks/use-hyperliquid-portfolio';
import { useMemo } from 'react';
import HyperLiquidSpotDataIndexer from '@/client/lib/spot-data-indexer';
import {
  HyperliquidApiSpotAssetContext,
  UserBalance,
} from '@/client/types/hyperliquid-api';
import { SpotItem } from '@/client/screens/main/main-screens/home/tabs/spot';

const ChooseToken = () => {
  const { closeDialog } = useDialogStore();
  const { setStep, setToken } = useSendTokenHLStore();
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
      console.error('Error creating SpotDataIndexer:', error);
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

  const handleClick = (token: UserBalance) => {
    setToken(token);
    setStep('send');
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Select Token to Send"
        onClose={closeDialog}
        icon={<X className="size-4" />}
      />
      <DialogContent>
        {isSpotLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading tokens...</div>
          </div>
        ) : spotError ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">Error loading tokens</div>
          </div>
        ) : (
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
                    onClick={() => handleClick(balance)}
                    className="cursor-pointer hover:bg-[var(--card-color)]/50"
                  />
                ))}
              </div>
            ) : (
              <div className="bg-[var(--card-color)] text-muted-foreground rounded-lg p-3 text-center">
                No assets found
              </div>
            )}
          </>
        )}
      </DialogContent>
      <DialogFooter>
        <Button onClick={closeDialog} variant="secondary" className="w-full">
          Cancel
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ChooseToken;
