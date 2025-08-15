import hyperliquidLogo from "@/assets/logo/hl-mint-logo.png";
import ethereumLogo from "@/assets/logo/ethereum-eth-logo.png";
import baseLogo from "@/assets/logo/base-logo-in-blue.svg";
import arbitrumLogo from "@/assets/logo/arbitrum-arb-logo.png";
import usdcLogo from "@/assets/logo/usdc.svg";
import { ChainType } from "@/client/types/wallet";
import { fetchTokenImage, Network } from "../services/gecko-terminal-api";
import { TokenLogoCacheLib } from "../lib/token-logo-cache";

export const NETWORK_ICONS: Record<ChainType, string> = {
  hyperevm: hyperliquidLogo,
  ethereum: ethereumLogo,
  base: baseLogo,
  arbitrum: arbitrumLogo,
  'hyperevm-testnet': hyperliquidLogo,
};

export const getNetworkIcon = (networkId: ChainType): string => {
  return NETWORK_ICONS[networkId] || NETWORK_ICONS.hyperevm;
};

export const getTokenLogo = async (
  symbol: string,
  networkId?: ChainType,
  tokenAddress?: string
): Promise<string | null> => {
  switch (symbol.toLowerCase()) {
    case 'eth':
      return ethereumLogo;
    case 'weth':
      return ethereumLogo;
    case 'usdc':
      return usdcLogo;
    case 'hype':
      return hyperliquidLogo;
    default: {
      if (networkId && tokenAddress) {
        const tokenLogo = await getTokenLogoFromAddress(
          networkId,
          tokenAddress
        );
        return tokenLogo;
      }
      return null;
    }
  }
};

export const getTokenLogoFromAddress = async (
  networkId: ChainType,
  tokenAddress: string
) => {
  try {
    // Check cache first
    const cachedLogo = await TokenLogoCacheLib.getCachedLogo(networkId, tokenAddress);
    if (cachedLogo !== null) {
      return cachedLogo;
    }

    // If not in cache, fetch from API
    const tokenInfo = await fetchTokenImage(networkId as Network, tokenAddress);
    const imageUrl = tokenInfo.data.attributes.image_url;

    // Cache the result (even if null)
    await TokenLogoCacheLib.cacheLogo(networkId, tokenAddress, imageUrl);

    return imageUrl;
  } catch (error) {
    console.error("Error fetching token image:", error);

    // Cache the null result to avoid repeated failed requests
    await TokenLogoCacheLib.cacheLogo(networkId, tokenAddress, null);

    return null;
  }
};

export function getSpotTokenImage(token: string) {
  if (token === 'USDC') {
    return usdcLogo;
  }

  if (token.includes('USD')) {
    return `https://app.hyperliquid.xyz/coins/${token}_USDC.svg`;
  }

  if (token.startsWith('U')) {
    const tokenFormat = token.slice(1);
    return `https://app.hyperliquid.xyz/coins/${tokenFormat}_USDC.svg`;
  }

  return `https://app.hyperliquid.xyz/coins/${token}_USDC.svg`;
}
