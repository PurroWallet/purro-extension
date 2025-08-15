import DockToLeftIcon from '@/assets/icon-component/dock-to-left-icon';
import { hyperliquidLogo } from '@/assets/logo';
import { AccountIcon, AccountName } from '@/client/components/account';
import { openSidePanel } from '@/client/lib/utils';
import { cn } from '@/client/lib/utils';
import { Settings, X } from 'lucide-react';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useAccountSheetStore from '@/client/hooks/use-account-sheet-store';
import { useMemo } from 'react';
import useDrawerStore from '@/client/hooks/use-drawer-store';
import { SwapSettingsDrawer } from '@/client/components/drawers';
import { CircularTimer } from '@/client/components/ui/circular-timer';
import useSwapTimerStore from '@/client/hooks/use-swap-timer-store';

const MainHeader = ({
  className,
  currentScreen,
  onNftNetworkToggle,
  isNftNetworkVisible,
  isHistoryVisible,
  onHistoryToggle,
}: {
  className?: string;
  currentScreen: 'home' | 'explore' | 'nft' | 'history' | 'swap';
  onNftNetworkToggle?: () => void;
  onHistoryToggle?: () => void;
  isNftNetworkVisible: boolean;
  isHistoryVisible: boolean;
}) => {
  const { activeAccount, wallets } = useWalletStore();
  const { open: openAccountSheet } = useAccountSheetStore();
  const isSidepanel = window.location.pathname.includes('sidepanel.html');
  const isNftScreen = currentScreen === 'nft';
  const isHistoryScreen = currentScreen === 'history';
  const activeAccountAddress = useMemo(() => {
    return wallets[activeAccount?.id as string]?.eip155?.address;
  }, [activeAccount, wallets]);
  const isSwapScreen = currentScreen === 'swap';
  const { openDrawer } = useDrawerStore();
  const { timeLeft, isTimerActive } = useSwapTimerStore();

  return (
    <div
      className={cn(
        'p-3 flex items-center justify-between border-b border-white/10 z-[40] relative',
        className
      )}
    >
      <div
        className="flex items-center py-1 gap-2 pr-3 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
        onClick={openAccountSheet}
      >
        <div className="size-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
          <AccountIcon icon={activeAccount?.icon} alt="Account" />
        </div>
        <AccountName
          name={activeAccount?.name}
          address={activeAccountAddress}
        />
      </div>

      {!isSidepanel && !isNftScreen && !isHistoryScreen && !isSwapScreen && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-full p-2 transition-all duration-300"
          onClick={async () => {
            await openSidePanel();
          }}
        >
          <DockToLeftIcon className="size-5 text-white/90" />
        </div>
      )}

      {isNftScreen && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-full p-2 transition-all duration-300"
          onClick={onNftNetworkToggle}
        >
          {!isNftNetworkVisible ? (
            <img src={hyperliquidLogo} alt="Hyperliquid" className="size-5" />
          ) : (
            <Settings className="size-5 text-white/90" />
          )}
        </div>
      )}

      {isSwapScreen && (
        <div className="flex items-center gap-2">
          {/* Circular Timer */}
          {isTimerActive && (
            <div className="flex items-center justify-center">
              <CircularTimer
                timeLeft={timeLeft}
                totalTime={20}
                isActive={isTimerActive}
                size={24}
                strokeWidth={2}
              />
            </div>
          )}

          {/* Settings Button */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-full p-2 transition-all duration-300"
            onClick={() => openDrawer(<SwapSettingsDrawer />)}
          >
            <Settings className="size-5 text-white/90" />
          </div>
        </div>
      )}

      {isHistoryScreen && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-full p-2 transition-all duration-300"
          onClick={onHistoryToggle}
        >
          {!isHistoryVisible ? (
            <img src={hyperliquidLogo} alt="Hyperliquid" className="size-5" />
          ) : (
            <X className="size-5 text-white/90" />
          )}
        </div>
      )}
    </div>
  );
};

export const NftNetworkNotification = ({
  isVisible,
}: {
  isVisible: boolean;
}) => {
  return (
    <div
      className={cn(
        'bg-[var(--card-color)] border-b border-white/10 w-full overflow-hidden transition-all duration-300 ease-in-out',
        isVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="p-2">
        <p className="text-white/90 text-sm">
          You are viewing NFTs on Hyperliquid. Orther networks will be available
          soon.
        </p>
      </div>
    </div>
  );
};

export const HistoryNotification = ({ isVisible }: { isVisible: boolean }) => {
  return (
    <div
      className={cn(
        'bg-[var(--card-color)] border-b border-white/10 w-full overflow-hidden transition-all duration-300 ease-in-out',
        isVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="p-2">
        <p className="text-white/90 text-sm">
          You are viewing history on Hyperliquid. Orther networks will be
          available soon.
        </p>
      </div>
    </div>
  );
};

export default MainHeader;
