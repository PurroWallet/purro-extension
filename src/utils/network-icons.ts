import { hyperliquidLogo, arbitrumLogo, baseLogo, ethereumLogo } from "@/assets/logo";

// Centralized mapping between our internal chain slug IDs and logo assets
export const NETWORK_ICONS = {
    hyperevm: hyperliquidLogo,
    ethereum: ethereumLogo,
    base: baseLogo,
    arbitrum: arbitrumLogo,
} as const;

export type NetworkId = keyof typeof NETWORK_ICONS;

/**
 * Return logo url for provided network id. If id is unknown it returns empty string.
 */
export const getNetworkIcon = (id: string): string => {
    // Using index access so that consumers can still ask for dynamic id.
    return (NETWORK_ICONS as Record<string, string>)[id] ?? "";
}; 