import { ChainType } from "./account";

export type CreateWalletData = {
    password?: string;
    mnemonic: string;
}

export type CreateAccountData = {
    password?: string;
    accountName?: string;
    seedPhraseId?: string;
}

export type ImportPrivateKeyData = {
    privateKey: string;
    name?: string;
    icon?: string;
    chain: ChainType;
    password?: string;
}

export type ImportSeedPhraseData = {
    mnemonic: string;
    name?: string;
    derivationIndex?: number;
    icon?: string;
    password?: string;
}

export type ImportWatchOnlyData = {
    address: string;
    accountName?: string;
    password?: string;
}