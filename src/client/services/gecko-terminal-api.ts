import { ENDPOINTS } from './endpoints';

// https://www.geckoterminal.com/dex-api

export type Network = 'hyperevm' | 'eth' | 'base' | 'arbitrum';

export const fetchTrendingPools = async (networkId: Network, page: number) => {
  const response = await fetch(
    `${ENDPOINTS.GECKO_TERMINAL}/networks/${networkId}/trending_pools?page=${page}&duration=24h`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json;version=20230302',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchTopPoolsByDex = async (
  networkId: Network,
  dex: string,
  page: number,
  sort: 'h24_tx_count_desc' | 'h24_volume_usd_desc'
) => {
  const response = await fetch(
    `${ENDPOINTS.GECKO_TERMINAL}/networks/${networkId}/dexes/${dex}/pools?page=${page}&sort=${sort}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json;version=20230302',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

// Generic function to fetch token prices for any network
export const fetchTokenPrices = async (
  network: Network,
  addresses: string[]
) => {
  // GeckoTerminal has a limit of 30 addresses per request
  const BATCH_SIZE = 30;

  if (addresses.length === 0) {
    return { data: { attributes: { token_prices: {} } } };
  }

  // If we have 30 or fewer addresses, make a single request
  if (addresses.length <= BATCH_SIZE) {
    const response = await fetch(
      `${ENDPOINTS.GECKO_TERMINAL}/simple/networks/${network}/token_price/${addresses.join(',')}?include_24hr_price_change=true`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json;version=20230302',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
  }

  // For more than 30 addresses, split into batches
  const batches = [];
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    batches.push(addresses.slice(i, i + BATCH_SIZE));
  }

  // Make all batch requests in parallel
  const batchPromises = batches.map(async batch => {
    const response = await fetch(
      `${ENDPOINTS.GECKO_TERMINAL}/simple/networks/${network}/token_price/${batch.join(',')}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json;version=20230302',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
  });

  // Wait for all requests to complete
  const batchResults = await Promise.all(batchPromises);

  // Merge all token prices from different batches
  const mergedTokenPrices = {};
  const mergedMarketCap = {};
  const mergedVolume = {};
  const mergedPriceChange = {};
  const mergedTotalReserve = {};

  batchResults.forEach(result => {
    if (result?.data?.attributes) {
      Object.assign(
        mergedTokenPrices,
        result.data.attributes.token_prices || {}
      );
      Object.assign(
        mergedMarketCap,
        result.data.attributes.market_cap_usd || {}
      );
      Object.assign(mergedVolume, result.data.attributes.h24_volume_usd || {});
      Object.assign(
        mergedPriceChange,
        result.data.attributes.h24_price_change_percentage || {}
      );
      Object.assign(
        mergedTotalReserve,
        result.data.attributes.total_reserve_in_usd || {}
      );
    }
  });

  // Return in the same format as the original API
  return {
    data: {
      id: 'batched-token-prices',
      type: 'token_price',
      attributes: {
        token_prices: mergedTokenPrices,
        market_cap_usd: mergedMarketCap,
        h24_volume_usd: mergedVolume,
        h24_price_change_percentage: mergedPriceChange,
        total_reserve_in_usd: mergedTotalReserve,
      },
    },
  };
};

// Specific functions for each network (backward compatibility)
export const fetchHyperEvmTokenPrices = async (addresses: string[]) => {
  return fetchTokenPrices('hyperevm', addresses);
};

export const fetchEthereumTokenPrices = async (addresses: string[]) => {
  return fetchTokenPrices('eth', addresses);
};

export const fetchBaseTokenPrices = async (addresses: string[]) => {
  return fetchTokenPrices('base', addresses);
};

export const fetchArbitrumTokenPrices = async (addresses: string[]) => {
  return fetchTokenPrices('arbitrum', addresses);
};

export const fetchPoolTokenInfo = async (
  networkId: Network,
  poolAddress: string
) => {
  const response = await fetch(
    `${ENDPOINTS.GECKO_TERMINAL}/networks/${networkId}/pools/${poolAddress}/info`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json;version=20230302',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchTopPoolsForAToken = async (
  networkId: Network,
  tokenAddress: string
) => {
  const response = await fetch(
    `${ENDPOINTS.GECKO_TERMINAL}/networks/${networkId}/tokens/${tokenAddress}/pools`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json;version=20230302',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};

export const fetchTokenImage = async (
  networkId: Network,
  tokenAddress: string
): Promise<{ data: { attributes: { image_url: string } } }> => {
  const response = await fetch(
    `${ENDPOINTS.GECKO_TERMINAL}/networks/${networkId}/tokens/${tokenAddress}?include=image_url`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json;version=20230302',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return await response.json();
};
