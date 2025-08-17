import { BellIcon, EyeIcon, XIcon } from 'lucide-react';
import WalletTabs from './tabs';
import { useOptimizedPortfolio } from '@/client/hooks/use-optimized-portfolio';
import { formatCurrency } from '@/client/utils/formatters';
import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/client/lib/utils';
import useDrawerStore from '@/client/hooks/use-drawer-store';
import {
  ReceiveChooseDrawer,
  BridgeDrawer,
  SendDrawer,
} from '@/client/components/drawers';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useDevModeStore from '@/client/hooks/use-dev-mode';
import { useUnifiedTokens } from '@/client/hooks/use-unified-tokens';
import SendAnimationIcon from '@/client/components/animation-icon/send';
import ReceiveAnimationIcon from '@/client/components/animation-icon/receive';
import SwapAnimationIcon from '@/client/components/animation-icon/swap';
import BridgeAnimationIcon from '@/client/components/animation-icon/bridge';
import useMainScreenStore from '@/client/hooks/use-main-screen-store';
import useNotificationsStore from '@/client/hooks/use-notifications-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import NotificationsDialog from '@/client/components/dialogs/notifications-dialog';
import { IconButton } from '@/client/components/ui';

const Home = () => {
  const { totalBalance, isLoading } = useOptimizedPortfolio();
  const [displayValue, setDisplayValue] = useState(0);
  const { activeAccount } = useWalletStore();
  const { openDrawer } = useDrawerStore();
  const { isDevMode } = useDevModeStore();
  const [buttonHovered, setButtonHovered] = useState<string | null>(null);
  const { setMainScreen } = useMainScreenStore();
  const { hasUnviewedNotifications, markAsViewed, getLatestNotification } =
    useNotificationsStore();
  const { openDialog } = useDialogStore();

  // In dev mode, get testnet tokens to show raw HYPE balance
  const { allUnifiedTokens } = useUnifiedTokens();

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
      <div className={cn('text-center h-44', isWatchOnly && 'h-fit')}>
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
                onMouseEnter={() => setButtonHovered('send')}
                onMouseLeave={() => setButtonHovered(null)}
                icon={
                  <SendAnimationIcon
                    className="text-[var(--text-color)] size-5"
                    isHovered={buttonHovered === 'send'}
                  />
                }
                onClick={() => {
                  openDrawer(<SendDrawer />);
                }}
                className="text-[var(--text-color)]"
              >
                Send
              </Button>
              <Button
                onMouseEnter={() => setButtonHovered('receive')}
                onMouseLeave={() => setButtonHovered(null)}
                icon={
                  <ReceiveAnimationIcon
                    className="text-[var(--text-color)] size-5"
                    isHovered={buttonHovered === 'receive'}
                  />
                }
                onClick={() => {
                  openDrawer(<ReceiveChooseDrawer />);
                }}
                className="text-[var(--text-color)]"
              >
                Receive
              </Button>
              <Button
                onMouseEnter={() => setButtonHovered('swap')}
                onMouseLeave={() => setButtonHovered(null)}
                icon={
                  <SwapAnimationIcon
                    className="text-[var(--text-color)]"
                    isHovered={buttonHovered === 'swap'}
                  />
                }
                onClick={() => {
                  setMainScreen('swap');
                }}
                className="text-[var(--text-color)]"
              >
                Swap
              </Button>
              <Button
                onMouseEnter={() => setButtonHovered('bridge')}
                onMouseLeave={() => setButtonHovered(null)}
                icon={
                  <BridgeAnimationIcon
                    className="text-[var(--text-color)]"
                    isHovered={buttonHovered === 'bridge'}
                  />
                }
                onClick={() => {
                  openDrawer(<BridgeDrawer />);
                }}
                className="text-[var(--text-color)]"
              >
                Bridge
              </Button>
            </div>
          )}
        </div>
      </div>
      {hasUnviewedNotifications() && (
        <div className="w-full flex items-center justify-center overflow-hidden">
          <div className="flex items-center justify-center w-[90%] bg-[var(--primary-color-dark)] rounded-2xl p-4 relative hover:scale-[102%] transition-all duration-300">
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => openDialog(<NotificationsDialog />)}
            >
              <div className="relative">
                <BellIcon className="size-5 text-white" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--primary-color-light)] rounded-full" />
              </div>
              <p className="text-white text-sm">
                Welcome to Purro Beta! Check out our latest updates and
                features.
              </p>
            </div>
            <div
              onClick={e => {
                e.stopPropagation();
              }}
            >
              <IconButton
                onClick={() => {
                  const latestNotification = getLatestNotification();
                  if (latestNotification) {
                    markAsViewed(latestNotification.id);
                  }
                }}
              >
                <XIcon className="size-4 text-white" />
              </IconButton>
            </div>
          </div>
        </div>
      )}
      <WalletTabs />
    </div>
  );
};

const Button = ({
  children,
  icon,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  className?: string;
}) => {
  return (
    <button
      className={cn(
        'flex flex-col items-center py-4 hover:bg-white/10 transition-all duration-300 cursor-pointer text-[var(--primary-color-light)] pt-5 overflow-hidden',
        className
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {icon}
      {children}
    </button>
  );
};

export default Home;
