import { AccountType, ChainType } from '@/background/types/account';

export interface WalletAccount {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  icon: string;
  seedPhraseId?: string;
  privateKeyId?: string;
  type: AccountType;
  wallets?: {
    [key in ChainType]: {
      address: string;
      publicKey: string;
    } | null;
  };
}
