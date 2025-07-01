export type AccountType = "privateKey" | "seedPhrase" | "watchOnly" | "seedless";

export type AccountInformation = {
    id: string;
    name: string;
    icon: string;
    source: AccountType;
    derivationIndex?: number;
    privateKeyId?: string;
    seedPhraseId?: string;
}

export type ChainType = "eip155" | "solana" | "sui"

export const supportedChain = ["solana", "sui", "hyperevm", "base", "arbitrum", "ethereum"] as const;
export type SupportedChainType = (typeof supportedChain)[number];

export type AccountWallet = {
    [key in ChainType]: {
        address: string;
        publicKey?: string | {
            data: string;
            type: "Buffer";
        };
        pathType?: string;
    } | null;
}

export type DataEncryption = {
    digest: string;
    encrypted: string;
    iterations: number;
    kdf: string;
    nonce: string;
    salt: string;
}

export type SeedPhraseData = {
    data: DataEncryption;
    name: string;
    currentDerivationIndex?: number;
    accountIds?: string[];
}

