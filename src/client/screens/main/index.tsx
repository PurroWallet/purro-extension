import React, { useState } from 'react';
import LockDisplay from '@/client/components/display/lock-display';
import { Dialog, Drawer } from '@/client/components/ui';
import useInit from '@/client/hooks/use-init';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import MainHeader, {
  HistoryNotification,
  NftNetworkNotification,
} from './main-header';
import { cn } from '@/client/lib/utils';
import AccountSheet from '@/client/components/account-sheet/account-sheet';
import Home from './main-screens/home';
import Nft from './main-screens/nft';
import History from './main-screens/history';
import Swap from './main-screens/swap';
import HomeAnimationIcon from '@/client/components/animation-icon/home';
import SwapAnimationIcon from '@/client/components/animation-icon/swap';
import NftsAnimationIcon from '@/client/components/animation-icon/nfts';
import HistoryAnimationIcon from '@/client/components/animation-icon/history';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useMainScreenStore from '@/client/hooks/use-main-screen-store';

const queryClient = new QueryClient();

const Main = () => {
  useInit();

  return (
    <QueryClientProvider client={queryClient}>
      <LockDisplay />
      <Dialog />
      <Drawer />
      <AccountSheet />
      <MainContent />
    </QueryClientProvider>
  );
};

export const MainContent = () => {
  const [buttonHovered, setButtonHovered] = useState<string | null>(null);
  const { activeAccount } = useWalletStore();
  const isWatchOnly = activeAccount?.source === 'watchOnly';

  const {
    mainScreen,
    isNftNetworkVisible,
    isHistoryVisible,
    setMainScreen,
    toggleNftNetwork,
    toggleHistory,
  } = useMainScreenStore();

  // Auto-switch away from swap screen if account becomes watch-only
  useEffect(() => {
    if (isWatchOnly && mainScreen === 'swap') {
      setMainScreen('home');
    }
  }, [isWatchOnly, mainScreen, setMainScreen]);

  return (
    <div className="size-full relative flex flex-col h-screen">
      <MainHeader
        className={cn(
          mainScreen === 'home' && 'bg-[var(--primary-color)] border-b-0'
        )}
        currentScreen={mainScreen}
        onNftNetworkToggle={toggleNftNetwork}
        isNftNetworkVisible={isNftNetworkVisible}
        isHistoryVisible={isHistoryVisible}
        onHistoryToggle={toggleHistory}
      />
      {mainScreen === 'nft' && (
        <NftNetworkNotification isVisible={isNftNetworkVisible} />
      )}
      {mainScreen === 'history' && (
        <HistoryNotification isVisible={isHistoryVisible} />
      )}
      <div className={cn('flex-1 overflow-y-auto transition-all duration-300')}>
        {mainScreen === 'home' && <Home />}
        {mainScreen === 'swap' && <Swap />}
        {/* {mainScreen === "explore" && <Explore />} */}
        {mainScreen === 'history' && <History />}
        {mainScreen === 'nft' && <Nft />}
      </div>

      <div
        className={cn(
          'grid w-full border-t border-white/10',
          isWatchOnly ? 'grid-cols-3' : 'grid-cols-4'
        )}
      >
        <MainScreenTabButton
          isActive={mainScreen === 'home'}
          onClick={() => setMainScreen('home')}
          icon={
            <HomeAnimationIcon
              className={cn(
                mainScreen === 'home' && 'text-[var(--primary-color-light)]',
                'size-6'
              )}
              isHovered={buttonHovered === 'home'}
            />
          }
          onMouseEnter={() => setButtonHovered('home')}
          onMouseLeave={() => setButtonHovered(null)}
        />
        {!isWatchOnly && (
          <MainScreenTabButton
            isActive={mainScreen === 'swap'}
            onClick={() => setMainScreen('swap')}
            onMouseEnter={() => setButtonHovered('swap')}
            onMouseLeave={() => setButtonHovered(null)}
            icon={
              <SwapAnimationIcon
                className={cn(
                  mainScreen === 'swap' && 'text-[var(--primary-color-light)]'
                )}
                isHovered={buttonHovered === 'swap'}
              />
            }
          />
        )}
        <MainScreenTabButton
          isActive={mainScreen === 'nft'}
          onClick={() => setMainScreen('nft')}
          onMouseEnter={() => setButtonHovered('nft')}
          onMouseLeave={() => setButtonHovered(null)}
          icon={
            <NftsAnimationIcon
              className={cn(
                mainScreen === 'nft' && 'text-[var(--primary-color-light)]'
              )}
              isHovered={buttonHovered === 'nft'}
            />
          }
        />
        <MainScreenTabButton
          isActive={mainScreen === 'history'}
          onClick={() => setMainScreen('history')}
          onMouseEnter={() => setButtonHovered('history')}
          onMouseLeave={() => setButtonHovered(null)}
          icon={
            <HistoryAnimationIcon
              className={cn(
                mainScreen === 'history' && 'text-[var(--primary-color-light)]'
              )}
              isHovered={buttonHovered === 'history'}
            />
          }
        />
        {/* <MainScreenTabButton
          isActive={mainScreen === "explore"}
          onClick={() => setMainScreen("explore")}
          icon={
            <Search
              className={cn(
                mainScreen === "explore" && "text-[var(--primary-color-light)]"
              )}
            />
          }
        /> */}
      </div>
    </div>
  );
};

const MainScreenTabButton = ({
  isActive,
  onClick,
  icon,
  onMouseEnter,
  onMouseLeave,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  return (
    <button
      className={cn(
        'flex items-center justify-center py-4 transition-all cursor-pointer relative overflow-hidden',
        'hover:bg-white/5',
        isActive && ''
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={cn('transition-all relative z-10')}>{icon}</div>
    </button>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Main />);
}
