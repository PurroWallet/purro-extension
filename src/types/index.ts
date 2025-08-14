import {
  AccountInformation,
  AccountWallet,
  SeedPhraseData,
} from '@/background/types/account';

export interface WalletState {
  isLocked: boolean;
  hasWallet: boolean;
  accounts: AccountInformation[];
  activeAccount: AccountInformation | null;
  wallets: { [key: string]: AccountWallet };
}

export type SeedPhraseWithId = SeedPhraseData & { id: string };
