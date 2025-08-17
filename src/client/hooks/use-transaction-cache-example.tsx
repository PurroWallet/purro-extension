import React from 'react';
import { useCachedTransactions, useCachedInfiniteTransactions } from './use-transaction-cache';
import useWalletStore from './use-wallet-store';

/**
 * Example component demonstrating how to use the cached transaction hooks
 * 
 * This component shows how to:
 * 1. Use the single-chain cached transaction hook
 * 2. Use the multi-chain cached infinite transaction hook
 * 3. Handle loading states and errors
 * 4. Display cached vs fresh data
 */
export const CachedTransactionExample: React.FC = () => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const address = activeAccount?.eip155?.address;

  // Example 1: Single chain with caching (Ethereum mainnet)
  const {
    data: ethTransactions,
    isLoading: ethLoading,
    error: ethError,
  } = useCachedTransactions(address || '', 1, {
    enabled: !!address,
    enableCache: true, // Enable caching
    sort: 'desc',
    offset: 100,
  });

  // Example 2: Multi-chain with caching
  const {
    data: multiChainData,
    fetchNextPage,
    hasNextPage,
    isLoading: multiChainLoading,
    error: multiChainError,
  } = useCachedInfiniteTransactions(
    address || '',
    [1, 42161, 8453, 999], // Ethereum, Arbitrum, Base, HyperEVM
    {
      enabled: !!address,
      enableCache: true, // Enable caching
      sort: 'desc',
      offset: 50,
    }
  );

  // Example 3: Disable caching (fallback to original behavior)
  const {
    data: nonCachedTransactions,
    isLoading: nonCachedLoading,
  } = useCachedTransactions(address || '', 1, {
    enabled: !!address,
    enableCache: false, // Disable caching - uses original logic
    sort: 'desc',
    offset: 100,
  });

  if (!address) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">No active account found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Cached Transaction Examples</h1>
      
      {/* Example 1: Single Chain Cached */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">
          Example 1: Single Chain (Ethereum) with Caching
        </h2>
        
        {ethLoading && (
          <div className="flex items-center gap-2 text-blue-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading cached transactions...</span>
          </div>
        )}
        
        {ethError && (
          <div className="text-red-500">
            Error: {ethError.message}
          </div>
        )}
        
        {ethTransactions && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Found {ethTransactions.transactions.length} transactions
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {ethTransactions.transactions.slice(0, 5).map((tx) => (
                <div key={tx.hash} className="text-xs bg-gray-100 p-2 rounded">
                  <div className="font-mono">{tx.hash.slice(0, 20)}...</div>
                  <div className="text-gray-600">
                    Block: {tx.blockNumber} | Value: {tx.value} wei
                  </div>
                </div>
              ))}
              {ethTransactions.transactions.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  ... and {ethTransactions.transactions.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Example 2: Multi-Chain Cached */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">
          Example 2: Multi-Chain with Caching & Infinite Scroll
        </h2>
        
        {multiChainLoading && (
          <div className="flex items-center gap-2 text-blue-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading multi-chain transactions...</span>
          </div>
        )}
        
        {multiChainError && (
          <div className="text-red-500">
            Error: {multiChainError.message}
          </div>
        )}
        
        {multiChainData && (
          <div>
            <div className="mb-3">
              {multiChainData.pages.map((page, pageIndex) => (
                <div key={pageIndex} className="mb-2">
                  <p className="text-sm font-medium">Page {pageIndex + 1}:</p>
                  {page.results.map((chainResult) => (
                    <div key={chainResult.chainId} className="ml-4 text-sm">
                      <span className="font-medium">Chain {chainResult.chainId}:</span>{' '}
                      {chainResult.transactions.length} transactions
                      {chainResult.hasMore && (
                        <span className="text-blue-500 ml-2">(has more)</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Load More
              </button>
            )}
          </div>
        )}
      </div>

      {/* Example 3: Non-Cached (Original Behavior) */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">
          Example 3: Non-Cached (Original Behavior)
        </h2>
        
        {nonCachedLoading && (
          <div className="flex items-center gap-2 text-orange-500">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading fresh transactions...</span>
          </div>
        )}
        
        {nonCachedTransactions && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Fresh data: {nonCachedTransactions.transactions.length} transactions
            </p>
            <div className="text-xs text-gray-600">
              This example disables caching and always fetches fresh data from the API.
            </div>
          </div>
        )}
      </div>

      {/* Cache Information */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <h2 className="text-lg font-semibold mb-3">How the Cache Works</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>🚀 Smart Fetching:</strong> Only fetches new transactions from the last cached block
          </p>
          <p>
            <strong>⚡ Fast Loading:</strong> Returns cached data immediately if fresh (within 5 minutes)
          </p>
          <p>
            <strong>🔄 Incremental Updates:</strong> Appends new transactions to existing cache
          </p>
          <p>
            <strong>💾 Storage Efficient:</strong> Limits cache to 5000 transactions per chain
          </p>
          <p>
            <strong>🔧 Backward Compatible:</strong> Set enableCache=false to use original logic
          </p>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="border rounded-lg p-4 bg-green-50">
        <h2 className="text-lg font-semibold mb-3">Usage Instructions</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>Replace existing hooks:</strong> Simply replace <code>useInfiniteTransactions</code> with <code>useCachedInfiniteTransactions</code>
          </p>
          <p>
            <strong>Enable caching:</strong> Add <code>enableCache: true</code> to options
          </p>
          <p>
            <strong>Fallback mode:</strong> Set <code>enableCache: false</code> to disable caching
          </p>
          <p>
            <strong>Same API:</strong> All existing options (sort, offset, enabled) work the same way
          </p>
        </div>
      </div>
    </div>
  );
};

export default CachedTransactionExample;
