import hyperliquidLogo from "@/assets/logo/hl-mint-logo.png";
import ethereumLogo from "@/assets/logo/ethereum-eth-logo.png";
import baseLogo from "@/assets/logo/base-logo-in-blue.svg";
import arbitrumLogo from "@/assets/logo/arbitrum-arb-logo.png";
import usdcLogo from "@/assets/logo/usdc.svg";
import { ChainType } from "@/client/types/wallet";
import { fetchTokenImage, Network } from "../services/gecko-terminal-api";
import { TokenLogoCacheLib } from "../lib/token-logo-cache";
import { BlacklistTokenLogoCacheLib } from "../lib/blacklist-token-logo-cache";

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
    // Clean old blacklist entries periodically
    BlacklistTokenLogoCacheLib.cleanBlacklist();

    // Check if token is blacklisted first
    if (BlacklistTokenLogoCacheLib.isBlacklisted(networkId, tokenAddress)) {
      return null;
    }

    // Check cache first
    const cachedLogo = await TokenLogoCacheLib.getCachedLogo(networkId, tokenAddress);
    if (cachedLogo !== null) {
      return cachedLogo;
    }

    // If not in cache, fetch from API
    const tokenInfo = await fetchTokenImage(networkId as Network, tokenAddress);

    // Check if the response contains error data indicating 404
    if (tokenInfo && typeof tokenInfo === 'object' && 'errors' in tokenInfo) {
      const errors = tokenInfo.errors;
      if (Array.isArray(errors) && errors.some(error => error.status === "404")) {
        BlacklistTokenLogoCacheLib.addToBlacklist(networkId, tokenAddress);

        // Cache the null result to avoid repeated failed requests
        await TokenLogoCacheLib.cacheLogo(networkId, tokenAddress, null);

        return null;
      }
    }

    // Check if response has the expected data structure
    if (!('data' in tokenInfo) || !tokenInfo.data?.attributes?.image_url) {

      // Cache the null result
      await TokenLogoCacheLib.cacheLogo(networkId, tokenAddress, null);

      return null;
    }

    const imageUrl = tokenInfo.data.attributes.image_url;

    // Cache the result (even if null)
    await TokenLogoCacheLib.cacheLogo(networkId, tokenAddress, imageUrl);

    return imageUrl;
  } catch (error) {
    console.error("Error fetching token image:", error);

    // Check if it's a 404 error and add to blacklist
    if (error instanceof Error && error.message.includes('404')) {
      BlacklistTokenLogoCacheLib.addToBlacklist(networkId, tokenAddress);
    }

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
