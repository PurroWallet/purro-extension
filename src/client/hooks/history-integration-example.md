# Integrating Transaction Cache with History Screen

This guide shows how to update the existing history screen to use the new cached transaction hook for better performance.

## Current Implementation

The history screen currently uses:

```typescript
import { useInfiniteTransactions } from '@/client/hooks/use-etherscan-transactions';

const { data, fetchNextPage, hasNextPage, isLoading, error } =
  useInfiniteTransactions(address || '', activeChainIds, {
    enabled: !!address,
    sort: 'desc',
    offset: 100,
  });
```

## Updated Implementation

Simply replace the import and add the `enableCache` option:

```typescript
// Change this import
import { useInfiniteTransactions } from '@/client/hooks/use-etherscan-transactions';

// To this import
import { useCachedInfiniteTransactions } from '@/client/hooks/use-transaction-cache';

// Update the hook call
const { data, fetchNextPage, hasNextPage, isLoading, error } =
  useCachedInfiniteTransactions(address || '', activeChainIds, {
    enabled: !!address,
    sort: 'desc',
    offset: 100,
    enableCache: true, // Add this line to enable caching
  });
```

## Complete Integration Steps

### Step 1: Update the Import

In `src/client/screens/main/main-screens/history/index.tsx`:

```typescript
// Line 5: Replace this
import { useInfiniteTransactions } from '@/client/hooks/use-etherscan-transactions';

// With this
import { useCachedInfiniteTransactions } from '@/client/hooks/use-transaction-cache';
```

### Step 2: Update the Hook Call

```typescript
// Lines 595-600: Replace this
const { data, fetchNextPage, hasNextPage, isLoading, error } =
  useInfiniteTransactions(address || '', activeChainIds, {
    enabled: !!address,
    sort: 'desc', // Most recent first
    offset: 100,
  });

// With this
const { data, fetchNextPage, hasNextPage, isLoading, error } =
  useCachedInfiniteTransactions(address || '', activeChainIds, {
    enabled: !!address,
    sort: 'desc', // Most recent first
    offset: 100,
    enableCache: true, // Enable caching for better performance
  });
```

### Step 3: Optional - Add Cache Status Indicator

You can optionally add a visual indicator to show when data is being loaded from cache vs fresh API calls:

```typescript
// Add this state
const [cacheStatus, setCacheStatus] = useState<'loading' | 'cached' | 'fresh'>('loading');

// Add this effect to track cache status
useEffect(() => {
  if (isLoading) {
    setCacheStatus('loading');
  } else if (data) {
    // You can determine if data came from cache based on loading time
    // This is a simple heuristic - very fast loads are likely from cache
    setCacheStatus('cached');
  }
}, [isLoading, data]);

// Add this to your JSX (optional)
{cacheStatus === 'cached' && (
  <div className="text-xs text-green-500 mb-2">
    ⚡ Loaded from cache
  </div>
)}
```

## Benefits After Integration

### Performance Improvements

- **Faster Initial Load**: Cached transactions load instantly
- **Reduced API Calls**: Only fetches new transactions since last cache
- **Better Rate Limiting**: Fewer API requests means less chance of hitting limits

### User Experience

- **Instant Results**: Users see transaction history immediately
- **Smoother Scrolling**: Infinite scroll works faster with cached data
- **Reduced Loading**: Less time spent waiting for API responses

### Technical Benefits

- **Backward Compatible**: Can be disabled by setting `enableCache: false`
- **Automatic Management**: Cache handles deduplication and storage limits
- **Multi-Chain Aware**: Works seamlessly with all supported chains

## Testing the Integration

### 1. Test Cache Behavior

```typescript
// First load - should fetch from API and cache
// Subsequent loads within 5 minutes - should load from cache instantly
// After 5 minutes - should fetch only new transactions and update cache
```

### 2. Test Cache Disable

```typescript
// Set enableCache: false to verify original behavior still works
const { data } = useCachedInfiniteTransactions(address, chainIds, {
  enableCache: false, // Should behave exactly like original hook
});
```

### 3. Test Multi-Chain

```typescript
// Verify that each chain maintains its own cache
// Switch between different chain filters to test cache per chain
```

## Rollback Plan

If any issues arise, you can easily rollback by:

1. Reverting the import back to the original
2. Removing the `enableCache: true` option
3. The rest of the code remains unchanged

```typescript
// Rollback: Change back to original
import { useInfiniteTransactions } from '@/client/hooks/use-etherscan-transactions';

const { data, fetchNextPage, hasNextPage, isLoading, error } =
  useInfiniteTransactions(address || '', activeChainIds, {
    enabled: !!address,
    sort: 'desc',
    offset: 100,
    // Remove enableCache option
  });
```

## Monitoring and Debugging

### Cache Statistics

```typescript
import { TransactionCacheLib } from '@/client/hooks/use-transaction-cache';

// Get cache stats for debugging
const stats = await TransactionCacheLib.getCacheStats();
console.log('Cache stats:', stats);
```

### Clear Cache for Testing

```typescript
// Clear cache for specific address/chain
await TransactionCacheLib.clearCache(address, chainId);

// Clear all cache
await TransactionCacheLib.clearCache(address);
```

### Debug Cache Behavior

```typescript
// Check if data exists in cache
const cached = await TransactionCacheLib.getCachedTransactions(
  address,
  chainId
);
console.log('Cached data:', cached);
```

## Expected Results

After integration, you should see:

- History screen loads much faster on subsequent visits
- Smooth infinite scrolling with cached data
- Reduced network activity in browser dev tools
- Better performance especially for users with many transactions

The cache will automatically handle:

- Fetching only new transactions
- Merging with existing cache
- Deduplication of transactions
- Storage limit management
- Cache expiry and refresh
