import { useQuery } from '@tanstack/react-query';
import {
  fetchTokensInfoByAddresses,
  Network,
} from '@/client/services/gecko-terminal-api';
import QueryKeys from '@/client/utils/query-keys';
import { ChainType } from '@/client/types/wallet';

export interface DetailedTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  price_usd: string;
  market_cap_usd: string;
  fdv_usd: string;
  total_reserve_in_usd: string;
  volume_usd: {
    h24: string;
  };
  price_change_24h?: string;
  image_url?: string;
  coingecko_coin_id?: string;
  total_supply?: string;
  normalized_total_supply?: string;
}

interface UseDetailedTokenInfoProps {
  chain: ChainType;
  contractAddress: string;
  enabled?: boolean;
}

export const useDetailedTokenInfo = ({
  chain,
  contractAddress,
  enabled = true,
}: UseDetailedTokenInfoProps) => {
  // Map chain to network
  const getNetwork = (chain: ChainType): Network => {
    switch (chain) {
      case 'hyperevm':
        return 'hyperevm';
      case 'ethereum':
        return 'eth';
      case 'base':
        return 'base';
      case 'arbitrum':
        return 'arbitrum';
      default:
        return 'hyperevm';
    }
  };

  // Handle native token addresses
  const getTokenAddress = (address: string, chain: ChainType): string => {
    if (address === 'native') {
      switch (chain) {
        case 'hyperevm':
          return '0x0000000000000000000000000000000000000000';
        case 'ethereum':
        case 'base':
        case 'arbitrum':
          return '0x0000000000000000000000000000000000000000';
        default:
          return address;
      }
    }
    return address;
  };

  const network = getNetwork(chain);
  const tokenAddress = getTokenAddress(contractAddress, chain);

  const query = useQuery({
    queryKey: [QueryKeys.DETAILED_TOKEN_INFO, network, tokenAddress],
    queryFn: async (): Promise<DetailedTokenInfo | null> => {
      try {
        const response = await fetchTokensInfoByAddresses(network, [
          tokenAddress,
        ]);

        // Handle new multi-token API response format
        if (response?.data && Array.isArray(response.data)) {
          const tokenData = response.data.find(
            (token: any) =>
              token.attributes.address.toLowerCase() ===
              tokenAddress.toLowerCase()
          );

          if (tokenData && tokenData.attributes) {
            const attrs = tokenData.attributes;
            return {
              address: attrs.address,
              name: attrs.name,
              symbol: attrs.symbol,
              decimals: attrs.decimals,
              price_usd: attrs.price_usd,
              market_cap_usd: attrs.market_cap_usd,
              fdv_usd: attrs.fdv_usd,
              total_reserve_in_usd: attrs.total_reserve_in_usd,
              volume_usd: attrs.volume_usd || { h24: '0' },
              image_url: attrs.image_url,
              coingecko_coin_id: attrs.coingecko_coin_id,
              total_supply: attrs.total_supply,
              normalized_total_supply: attrs.normalized_total_supply,
            };
          }
        }

        // Handle legacy format as fallback
        if (response?.data?.attributes) {
          const attributes = response.data.attributes as any;
          const prices = attributes.token_prices || {};
          const marketCaps = attributes.market_cap_usd || {};
          const volumes = attributes.h24_volume_usd || {};
          const reserves = attributes.total_reserve_in_usd || {};

          const addressKey = tokenAddress.toLowerCase();

          if (prices[addressKey]) {
            return {
              address: tokenAddress,
              name: 'Unknown',
              symbol: 'Unknown',
              decimals: 18,
              price_usd: prices[addressKey],
              market_cap_usd: marketCaps[addressKey] || '0',
              fdv_usd: '0',
              total_reserve_in_usd: reserves[addressKey] || '0',
              volume_usd: { h24: volumes[addressKey] || '0' },
            };
          }
        }

        return null;
      } catch (error) {
        console.error('Error fetching detailed token info:', error);
        throw error;
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!contractAddress && !!chain,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
};

// Helper function to format large numbers
export const formatTokenNumber = (
  value: string | number,
  prefix = '$'
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return 'N/A';

  if (num >= 1e12) {
    return `${prefix}${(num / 1e12).toFixed(2)}T`;
  } else if (num >= 1e9) {
    return `${prefix}${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${prefix}${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `${prefix}${(num / 1e3).toFixed(2)}K`;
  } else if (num >= 1) {
    return `${prefix}${num.toFixed(2)}`;
  } else {
    return `${prefix}${num.toFixed(6)}`;
  }
};

// Helper function to calculate price change percentage
export const calculatePriceChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to get explorer URL
export const getTokenExplorerUrl = (
  chain: ChainType,
  contractAddress: string,
  isNative?: boolean
): string | null => {
  // For native tokens, return price chart URLs instead of token contract URLs
  if (
    isNative ||
    contractAddress === 'NATIVE' ||
    contractAddress.toLowerCase().includes('native')
  ) {
    switch (chain) {
      case 'hyperevm':
        return 'https://hyperevmscan.io/chart/hypeprice';
      case 'ethereum':
      case 'base':
      case 'arbitrum':
        return 'https://etherscan.io/chart/etherprice';
      default:
        return null;
    }
  }

  // For ERC20 tokens, return normal token contract URLs
  switch (chain) {
    case 'hyperevm':
      return `https://hyperevmscan.com/token/${contractAddress}`;
    case 'ethereum':
      return `https://etherscan.io/token/${contractAddress}`;
    case 'base':
      return `https://basescan.org/token/${contractAddress}`;
    case 'arbitrum':
      return `https://arbiscan.io/token/${contractAddress}`;
    default:
      return null;
  }
};

// Helper function to get GeckoTerminal URL
export const getGeckoTerminalUrl = (
  chain: ChainType,
  contractAddress: string
): string => {
  const networkMap: Partial<Record<ChainType, string>> = {
    hyperevm: 'hyperevm',
    ethereum: 'eth',
    base: 'base',
    arbitrum: 'arbitrum',
  };

  const network = networkMap[chain] || 'hyperevm';
  return `https://www.geckoterminal.com/${network}/tokens/${contractAddress}`;
};
