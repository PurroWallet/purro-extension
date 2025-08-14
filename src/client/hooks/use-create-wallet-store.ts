import { SupportedChainType } from '@/background/types/account';
import { create } from 'zustand';

export type ImportType =
  | 'seed'
  | 'privateKey'
  | 'create-account'
  | 'watchOnly'
  | null;

export interface CreateWalletState {
  mnemonic?: string;
  password?: string;
  confirmPassword?: string;
  privateKey?: string;
  address?: string;
  chain?: SupportedChainType | null;
  accountName?: string;
  selectedSeedPhraseId?: string;
  importType?: ImportType;
}

export interface CreateWalletActions {
  setMnemonic: (mnemonic: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  setPrivateKey: (privateKey: string) => void;
  setAddress: (address: string) => void;
  setChain: (chain: SupportedChainType | null) => void;
  setAccountName: (accountName: string) => void;
  setSelectedSeedPhraseId: (seedPhraseId: string) => void;
  setImportType: (importType: ImportType) => void;
  reset: () => void;
}

const createWalletStore = create<CreateWalletState & CreateWalletActions>(
  set => ({
    mnemonic: undefined,
    password: undefined,
    confirmPassword: undefined,
    privateKey: undefined,
    address: undefined,
    chain: undefined,
    selectedSeedPhraseId: undefined,
    importType: null,
    setMnemonic: mnemonic => {
      set({ mnemonic });
    },
    setPassword: password => set({ password }),
    setConfirmPassword: confirmPassword => set({ confirmPassword }),
    setPrivateKey: privateKey => set({ privateKey }),
    setAddress: address => set({ address }),
    setChain: chain => set({ chain }),
    setAccountName: accountName => set({ accountName }),
    setSelectedSeedPhraseId: seedPhraseId =>
      set({ selectedSeedPhraseId: seedPhraseId }),
    setImportType: importType => set({ importType }),
    reset: () =>
      set({
        mnemonic: undefined,
        password: undefined,
        confirmPassword: undefined,
        privateKey: undefined,
        address: undefined,
        chain: undefined,
        accountName: undefined,
        selectedSeedPhraseId: undefined,
        importType: null,
      }),
  })
);

export default createWalletStore;
