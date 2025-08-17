# Transaction Cache Hook

A smart caching layer for Ethereum transaction fetching that dramatically improves performance by only fetching new transactions from the last cached block.

## Features

- 🚀 **Smart Incremental Fetching**: Only fetches new transactions from the last cached block
- ⚡ **Instant Loading**: Returns cached data immediately if fresh (within 5 minutes)
- 🔄 **Seamless Updates**: Automatically appends new transactions to existing cache
- 💾 **Storage Efficient**: Limits cache to 5000 transactions per chain to prevent bloat
- 🔧 **Backward Compatible**: Can be disabled to use original fetching logic
- 🌐 **Multi-Chain Support**: Works with all supported chains (Ethereum, Arbitrum, Base, HyperEVM)

## Quick Start

### Replace Existing Hooks

Simply replace your existing transaction hooks with the cached versions:

```typescript
// Before
import { useInfiniteTransactions } from '@/client/hooks/use-etherscan-transactions';

// After
import { useCachedInfiniteTransactions } from '@/client/hooks/use-transaction-cache';
```

### Basic Usage

```typescript
import {
  useCachedTransactions,
  useCachedInfiniteTransactions,
} from '@/client/hooks/use-transaction-cache';

// Single chain with caching
const { data, isLoading, error } = useCachedTransactions(
  address,
  1, // Ethereum mainnet
  {
    enabled: !!address,
    enableCache: true, // Enable caching
    sort: 'desc',
    offset: 100,
  }
);

// Multi-chain with caching
const { data, fetchNextPage, hasNextPage, isLoading, error } =
  useCachedInfiniteTransactions(
    address,
    [1, 42161, 8453, 999], // Multiple chains
    {
      enabled: !!address,
      enableCache: true, // Enable caching
      sort: 'desc',
      offset: 50,
    }
  );
```

## API Reference

### `useCachedTransactions`

Single-chain transaction fetching with caching.

```typescript
useCachedTransactions(
  address: string,
  chainId: number,
  options?: UseInfiniteTransactionsOptions & { enableCache?: boolean }
)
```

**Parameters:**

- `address`: Wallet address to fetch transactions for
- `chainId`: Chain ID (1 = Ethereum, 42161 = Arbitrum, etc.)
- `options`: Configuration options
  - `enableCache`: Enable/disable caching (default: true)
  - `enabled`: Enable/disable the query (default: true)
  - `sort`: Sort order 'asc' | 'desc' (default: 'asc')
  - `offset`: Number of transactions per page (default: 1000)

**Returns:**

- `data`: TransactionPage with transactions array
- `isLoading`: Loading state
- `error`: Error state
- Standard React Query return values

### `useCachedInfiniteTransactions`

Multi-chain transaction fetching with infinite scroll and caching.

```typescript
useCachedInfiniteTransactions(
  address: string,
  chainIds: number[],
  options?: UseInfiniteTransactionsOptions & { enableCache?: boolean }
)
```

**Parameters:**

- `address`: Wallet address to fetch transactions for
- `chainIds`: Array of chain IDs to fetch from
- `options`: Same as `useCachedTransactions`

**Returns:**

- `data`: Infinite query data with pages
- `fetchNextPage`: Function to load more data
- `hasNextPage`: Boolean indicating if more data is available
- `isLoading`: Loading state
- `error`: Error state
- Standard React Query infinite return values

## Cache Management

### `TransactionCacheLib`

Low-level cache management utilities:

```typescript
import { TransactionCacheLib } from '@/client/hooks/use-transaction-cache';

// Get cached transactions
const cached = await TransactionCacheLib.getCachedTransactions(
  address,
  chainId
);

// Cache transactions manually
await TransactionCacheLib.cacheTransactions(
  address,
  chainId,
  transactions,
  lastBlock
);

// Append new transactions
await TransactionCacheLib.appendTransactions(
  address,
  chainId,
  newTransactions,
  newLastBlock
);

// Clear cache
await TransactionCacheLib.clearCache(address, chainId);
```

## How It Works

### 1. First Load

- Checks for existing cached data
- If no cache exists, fetches from block 0
- Caches all transactions with the last block number

### 2. Subsequent Loads

- Checks cache freshness (5-minute expiry)
- If fresh, returns cached data immediately
- If stale, fetches only new transactions from last cached block + 1
- Merges new transactions with cached data
- Updates cache with new last block number

### 3. Cache Storage

- Uses Chrome extension storage API
- Stores up to 5000 transactions per chain per address
- Automatically removes oldest transactions when limit is reached
- Deduplicates transactions by hash

## Configuration

### Cache Settings

```typescript
// In use-transaction-cache.ts
const TRANSACTION_CACHE_KEY = 'purro:transaction-cache';
const MAX_TRANSACTIONS_PER_CHAIN = 5000; // Limit per chain
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
```

### Disable Caching

To use original behavior without caching:

```typescript
const { data } = useCachedTransactions(address, chainId, {
  enableCache: false, // Disables caching
});
```

## Migration Guide

### From `useInfiniteTransactions`

```typescript
// Before
const { data, fetchNextPage, hasNextPage } = useInfiniteTransactions(
  address,
  chainIds,
  { sort: 'desc', offset: 100 }
);

// After
const { data, fetchNextPage, hasNextPage } = useCachedInfiniteTransactions(
  address,
  chainIds,
  {
    sort: 'desc',
    offset: 100,
    enableCache: true, // Add this line
  }
);
```

### From `useTransactions`

```typescript
// Before
const { data } = useTransactions(address, chainId, {
  sort: 'desc',
  offset: 100,
});

// After
const { data } = useCachedTransactions(address, chainId, {
  sort: 'desc',
  offset: 100,
  enableCache: true, // Add this line
});
```

## Performance Benefits

- **Reduced API Calls**: Only fetches new transactions, not entire history
- **Faster Loading**: Cached data loads instantly
- **Lower Rate Limiting**: Fewer API requests means less chance of hitting rate limits
- **Better UX**: Users see data immediately while new data loads in background

## Best Practices

1. **Enable caching by default** for better performance
2. **Use appropriate cache expiry** (5 minutes is good for most use cases)
3. **Handle loading states** properly for better UX
4. **Clear cache when needed** (e.g., when switching accounts)
5. **Monitor storage usage** in development

## Troubleshooting

### Cache Not Working

- Check if `enableCache: true` is set
- Verify Chrome storage permissions
- Check browser console for errors

### Stale Data

- Cache expires after 5 minutes automatically
- Clear cache manually if needed: `TransactionCacheLib.clearCache(address, chainId)`

### Storage Issues

- Cache is limited to 5000 transactions per chain
- Oldest transactions are automatically removed
- Clear all cache: `TransactionCacheLib.clearCache(address)`

## Example Implementation

See `use-transaction-cache-example.tsx` for a complete working example showing all features and usage patterns.
