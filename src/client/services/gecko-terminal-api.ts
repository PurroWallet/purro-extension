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
export const fetchTokensInfoByAddresses = async (
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
      `${ENDPOINTS.GECKO_TERMINAL}/networks/${network}/tokens/multi/${addresses.join(',')}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const result = await response.json();
    return transformMultiTokenResponse(result);
  }

  // For more than 30 addresses, split into batches
  const batches = [];
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    batches.push(addresses.slice(i, i + BATCH_SIZE));
  }

  // Make all batch requests in parallel
  const batchPromises = batches.map(async batch => {
    const response = await fetch(
      `${ENDPOINTS.GECKO_TERMINAL}/networks/${network}/tokens/multi/${batch.join(',')}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
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

  // Merge all token data from different batches
  const mergedTokenPrices: Record<string, string> = {};
  const mergedMarketCap: Record<string, string> = {};
  const mergedVolume: Record<string, string> = {};
  const mergedTotalReserve: Record<string, string> = {};

  batchResults.forEach((result: any) => {
    if (result?.data && Array.isArray(result.data)) {
      result.data.forEach((token: any) => {
        const address = token.attributes.address.toLowerCase();
        mergedTokenPrices[address] = token.attributes.price_usd;
        mergedMarketCap[address] = token.attributes.market_cap_usd;
        mergedVolume[address] = token.attributes.volume_usd?.h24;
        mergedTotalReserve[address] = token.attributes.total_reserve_in_usd;
      });
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
        total_reserve_in_usd: mergedTotalReserve,
      },
    },
  };
};

// Helper function to transform the new multi-token API response to match the old format
const transformMultiTokenResponse = (response: any) => {
  const tokenPrices: Record<string, string> = {};
  const marketCap: Record<string, string> = {};
  const volume: Record<string, string> = {};
  const totalReserve: Record<string, string> = {};

  if (response?.data && Array.isArray(response.data)) {
    response.data.forEach((token: any) => {
      const address = token.attributes.address.toLowerCase();
      tokenPrices[address] = token.attributes.price_usd;
      marketCap[address] = token.attributes.market_cap_usd;
      volume[address] = token.attributes.volume_usd?.h24;
      totalReserve[address] = token.attributes.total_reserve_in_usd;
    });
  }

  return {
    data: {
      id: 'multi-token-prices',
      type: 'token_price',
      attributes: {
        token_prices: tokenPrices,
        market_cap_usd: marketCap,
        h24_volume_usd: volume,
        total_reserve_in_usd: totalReserve,
      },
    },
  };
};

// Specific functions for each network (backward compatibility)
export const fetchHyperEvmTokenPrices = async (addresses: string[]) => {
  return fetchTokensInfoByAddresses('hyperevm', addresses);
};

export const fetchEthereumTokenPrices = async (addresses: string[]) => {
  return fetchTokensInfoByAddresses('eth', addresses);
};

export const fetchBaseTokenPrices = async (addresses: string[]) => {
  return fetchTokensInfoByAddresses('base', addresses);
};

export const fetchArbitrumTokenPrices = async (addresses: string[]) => {
  return fetchTokensInfoByAddresses('arbitrum', addresses);
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
): Promise<{ data: { attributes: { image_url: string } } } | { errors: Array<{ status: string; title: string }>; meta: { ref_id: string } }> => {
  const response = await fetch(
    `${ENDPOINTS.GECKO_TERMINAL}/networks/${networkId}/tokens/${tokenAddress}?include=image_url`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json;version=20230302',
      },
    }
  );

  const responseData = await response.json();

  // If response is not ok, but we got JSON data, it might be an error response
  // Don't throw immediately, let the caller handle the error response
  if (!response.ok) {
    // Check if it's the specific error format you mentioned
    if (responseData && typeof responseData === 'object' && 'errors' in responseData) {
      return responseData; // Return the error response for the caller to handle
    }

    // For other types of errors, throw as before
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return responseData;
};
