export const chainIds = [
    "hyperevm",
    "ethereum",
    "base",
    "arbitrum",
] as const;

export type ChainTypeClient = (typeof chainIds)[number]; 