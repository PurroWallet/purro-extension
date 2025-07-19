import hyperliquidLogo from '@/assets/logo/hl-mint-logo.png';
import ethereumLogo from '@/assets/logo/ethereum-eth-logo.png';
import baseLogo from '@/assets/logo/base-logo-in-blue.svg';
import arbitrumLogo from '@/assets/logo/arbitrum-arb-logo.png';
import usdcLogo from '@/assets/logo/usdc.svg';
import { ChainType } from '@/client/types/wallet';

export const NETWORK_ICONS: Record<ChainType, string> = {
    hyperevm: hyperliquidLogo,
    ethereum: ethereumLogo,
    base: baseLogo,
    arbitrum: arbitrumLogo,
};

export const getNetworkIcon = (networkId: ChainType): string => {
    return NETWORK_ICONS[networkId] || NETWORK_ICONS.hyperevm;
};

export const getTokenLogo = (symbol: string): string | null => {
    switch (symbol.toLowerCase()) {
        case "eth":
            return ethereumLogo;
        case "weth":
            return ethereumLogo;
        case "usdc":
            return usdcLogo;
        case "hype":
            return hyperliquidLogo;
        default:
            return null;
    }
}

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
