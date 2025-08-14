import { useState, useEffect } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/components/ui/dialog';
import {
  getTokenCacheStats,
  clearChainTokenCache,
  clearAllTokenCache,
} from '@/services/alchemy-api-optimized';
import { Database, Trash2, HardDrive, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CacheStats {
  totalEntries: number;
  entriesByChain: { [chainId: string]: number };
  oldestEntry: number | null;
  newestEntry: number | null;
}

const TokenCacheManagement = ({ onBack }: { onBack: () => void }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const cacheStats = await getTokenCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearChainCache = async (
    chain: 'ethereum' | 'base' | 'arbitrum'
  ) => {
    try {
      setClearing(chain);
      await clearChainTokenCache(chain);
      await loadStats(); // Reload stats
      console.log(`✅ Cleared ${chain} token cache`);
    } catch (error) {
      console.error(`Failed to clear ${chain} cache:`, error);
    } finally {
      setClearing(null);
    }
  };

  const handleClearAllCache = async () => {
    try {
      setClearing('all');
      await clearAllTokenCache();
      await loadStats(); // Reload stats
      console.log('✅ Cleared all token cache');
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    } finally {
      setClearing(null);
    }
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };

  const getChainName = (chainId: string) => {
    switch (chainId) {
      case '1':
        return 'Ethereum';
      case '8453':
        return 'Base';
      case '42161':
        return 'Arbitrum';
      default:
        return `Chain ${chainId}`;
    }
  };

  const getChainKey = (chainId: string): 'ethereum' | 'base' | 'arbitrum' => {
    switch (chainId) {
      case '1':
        return 'ethereum';
      case '8453':
        return 'base';
      case '42161':
        return 'arbitrum';
      default:
        return 'ethereum';
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader title="Token Cache Management" onClose={onBack} />
      <DialogContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cache Overview */}
            <div className="bg-[var(--card-color)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="size-5 text-blue-400" />
                <h3 className="font-medium text-white">Cache Overview</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Entries</div>
                  <div className="font-medium text-white">
                    {stats?.totalEntries || 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Oldest Entry</div>
                  <div className="font-medium text-white">
                    {formatDate(stats?.oldestEntry)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cache by Chain */}
            <div className="space-y-2">
              <h3 className="font-medium text-white text-sm">Cache by Chain</h3>

              {stats?.entriesByChain &&
                Object.entries(stats.entriesByChain).map(([chainId, count]) => (
                  <div
                    key={chainId}
                    className="bg-[var(--card-color)] rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <HardDrive className="size-4 text-green-400" />
                        <div>
                          <div className="font-medium text-white text-sm">
                            {getChainName(chainId)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {count} cached tokens
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleClearChainCache(getChainKey(chainId))
                        }
                        disabled={clearing === getChainKey(chainId)}
                        className={cn(
                          'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                          'bg-red-500/20 text-red-400 hover:bg-red-500/30',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {clearing === getChainKey(chainId) ? (
                          <div className="flex items-center gap-1">
                            <div className="animate-spin rounded-full h-3 w-3 border border-red-400 border-b-transparent"></div>
                            Clearing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Trash2 className="size-3" />
                            Clear
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Cache Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Clock className="size-4 text-blue-400 mt-0.5" />
                <div className="text-xs text-blue-200">
                  <div className="font-medium mb-1">
                    About Token Metadata Cache
                  </div>
                  <div className="text-blue-200/80">
                    Token metadata (name, symbol, decimals) is cached
                    permanently to improve performance. Only token balances are
                    fetched in real-time. Clear cache only if you experience
                    issues.
                  </div>
                </div>
              </div>
            </div>

            {/* Clear All Button */}
            {stats && stats.totalEntries > 0 && (
              <button
                onClick={handleClearAllCache}
                disabled={clearing === 'all'}
                className={cn(
                  'w-full py-3 px-4 rounded-lg font-medium transition-colors',
                  'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {clearing === 'all' ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border border-red-400 border-b-transparent"></div>
                    Clearing All Cache...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Trash2 className="size-4" />
                    Clear All Cache
                  </div>
                )}
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </DialogWrapper>
  );
};

export default TokenCacheManagement;
