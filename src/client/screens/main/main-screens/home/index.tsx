import ShuffleIcon from '@/assets/icon-component/shuffle-icon';
import SwapVertIcon from '@/assets/icon-component/swap-vert-icon';
import { CircleFadingPlus, EyeIcon } from 'lucide-react';
import WalletTabs from './tabs';
import SendIcon from '@/assets/icon-component/send-icon';
import { useOptimizedPortfolio } from '@/client/hooks/use-optimized-portfolio';
import { formatCurrency } from '@/client/utils/formatters';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/client/lib/utils';
import useDrawerStore from '@/client/hooks/use-drawer-store';
import {
  ReceiveChooseDrawer,
  SwapDrawer,
  BridgeDrawer,
  SendDrawer,
} from '@/client/components/drawers';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useDevModeStore from '@/client/hooks/use-dev-mode';
import { useUnifiedTokens } from '@/client/hooks/use-unified-tokens';

const Home = () => {
  const { totalBalance, isLoading } = useOptimizedPortfolio();
  const [displayValue, setDisplayValue] = useState(0);
  const { activeAccount } = useWalletStore();
  const { openDrawer } = useDrawerStore();
  const { isDevMode } = useDevModeStore();

  // In dev mode, get testnet tokens to show raw HYPE balance
  const { allUnifiedTokens, isLoading: isTestnetLoading } = useUnifiedTokens();

  // Compute HYPE native balance on testnet
  const testnetHypeBalance = useMemo(() => {
    if (!isDevMode) return 0;
    return (allUnifiedTokens || [])
      .filter(t => t.chain === 'hyperevm-testnet' && t.isNative)
      .reduce((sum, t) => sum + (t.balanceFormatted || 0), 0);
  }, [isDevMode, allUnifiedTokens]);

  // Update display value only when not loading
  useEffect(() => {
    if (!isLoading && totalBalance > 0) {
      setDisplayValue(totalBalance);
    }
  }, [totalBalance, isLoading]);

  // Use stable display value if loading and we have a previous value
  const finalUsdValue =
    isLoading && displayValue > 0 ? displayValue : totalBalance;
  const isWatchOnly = activeAccount?.source === 'watchOnly';

  return (
    <div>
      <div className={cn('text-center h-48', isWatchOnly && 'h-fit')}>
        <div
          className={cn(
            'bg-[var(--primary-color)] h-32 relative pt-4',
            isWatchOnly && 'h-fit pb-4'
          )}
        >
          <h1 className={cn('text-5xl font-bold text-center')}>
            {isDevMode && (
              <>
                {testnetHypeBalance.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
                <span className="pl-2 text-2xl">HYPE</span>
              </>
            )}
            {!isDevMode && formatCurrency(finalUsdValue)}
          </h1>
          {isWatchOnly && (
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 w-fit mb-2">
                <EyeIcon className="size-4" />
                <p className="text-white text-xs">Watch Only</p>
              </div>
            </div>
          )}

          {!isWatchOnly && (
            <div className="grid grid-cols-4 bg-[var(--primary-color-dark)] w-[90%] rounded-2xl absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 items-center overflow-hidden">
              <Button
                icon={
                  <SendIcon className="text-[var(--primary-color-light)] size-5" />
                }
                onClick={() => {
                  openDrawer(<SendDrawer />);
                }}
              >
                Send
              </Button>
              <Button
                icon={
                  <CircleFadingPlus className="text-[var(--primary-color-light)] size-5" />
                }
                onClick={() => {
                  openDrawer(<ReceiveChooseDrawer />);
                }}
              >
                Receive
              </Button>
              <Button
                icon={
                  <SwapVertIcon className="text-[var(--primary-color-light)]" />
                }
                onClick={() => {
                  openDrawer(<SwapDrawer />);
                }}
              >
                Swap
              </Button>
              <Button
                icon={
                  <ShuffleIcon className="text-[var(--primary-color-light)]" />
                }
                onClick={() => {
                  openDrawer(<BridgeDrawer />);
                }}
              >
                Bridge
              </Button>
            </div>
          )}
        </div>
      </div>
      <WalletTabs />
    </div>
  );
};

const Button = ({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <button
      className="flex flex-col items-center py-4 hover:bg-white/10 transition-all duration-300 cursor-pointer text-[var(--primary-color-light)] pt-5"
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
};

export default Home;
