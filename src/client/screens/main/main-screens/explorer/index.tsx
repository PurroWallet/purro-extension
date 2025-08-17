import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/client/lib/utils';
import { DAPPS_DATA, type DApp } from './dapps-data';
import useWatchlistStore from '@/client/hooks/use-watchlist-store';

const Explorer = () => {
  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlistStore();

  // Sort DApps: watchlist items first, then others
  const sortedDApps = useMemo(() => {
    const watchlistDApps = DAPPS_DATA.filter(dapp => isInWatchlist(dapp.id));
    const otherDApps = DAPPS_DATA.filter(dapp => !isInWatchlist(dapp.id));
    return [...watchlistDApps, ...otherDApps];
  }, [watchlist, isInWatchlist]);

  const openDApp = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleStarClick = (e: React.MouseEvent, dappId: string) => {
    e.stopPropagation(); // Prevent opening the DApp
    toggleWatchlist(dappId);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background-color)]">
      {/* DApps List */}
      <div className="flex-1 overflow-y-auto">
        {sortedDApps.map((dapp, index) => {
          const isWatched = isInWatchlist(dapp.id);
          const isFirstNonWatched =
            !isWatched && index > 0 && isInWatchlist(sortedDApps[index - 1].id);

          return (
            <DAppListItem
              key={dapp.id}
              dapp={dapp}
              isWatched={isWatched}
              showSeparator={isFirstNonWatched}
              onOpen={() => openDApp(dapp.url)}
              onStarClick={e => handleStarClick(e, dapp.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

// DApp List Item Component with watchlist support
interface DAppListItemProps {
  dapp: DApp;
  isWatched: boolean;
  showSeparator: boolean;
  onOpen: () => void;
  onStarClick: (e: React.MouseEvent) => void;
}

const DAppListItem: React.FC<DAppListItemProps> = ({
  dapp,
  isWatched,
  showSeparator,
  onOpen,
  onStarClick,
}) => {
  return (
    <>
      {/* Separator between watchlist and other DApps */}
      {showSeparator && (
        <div className="px-4 py-2 mt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Other DApps
          </p>
        </div>
      )}

      <div
        onClick={onOpen}
        className={cn(
          'flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-b-0',
          isWatched && 'bg-white/[0.02]' // Subtle highlight for watched DApps
        )}
      >
        {/* Logo */}
        <img
          src={dapp.logo}
          alt={dapp.name}
          className="size-10 rounded-lg flex-shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-base">{dapp.name}</h3>
          </div>
          <p className="text-sm text-gray-400">{dapp.category}</p>
        </div>

        {/* Star Button */}
        <button
          onClick={onStarClick}
          className={cn(
            'p-2 rounded-lg transition-all hover:bg-white/10 flex-shrink-0',
            isWatched ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <Star
            className={cn(
              'size-4 transition-all',
              isWatched ? 'fill-current' : 'stroke-current'
            )}
          />
        </button>
      </div>
    </>
  );
};

export default Explorer;
