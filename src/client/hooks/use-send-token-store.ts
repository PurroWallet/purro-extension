import { UnifiedToken } from '@/client/components/token-list';
import { create } from 'zustand';

interface SendTokenState {
  step: 'select' | 'send' | 'confirm' | 'success';
  token: UnifiedToken | null;
  amount: string;
  recipient: string;
  transactionHash: string;
  setStep: (step: 'select' | 'send' | 'confirm' | 'success') => void;
  setToken: (token: UnifiedToken | null) => void;
  setAmount: (amount: string) => void;
  setRecipient: (recipient: string) => void;
  setTransactionHash: (hash: string) => void;
}

const useSendTokenStore = create<SendTokenState>(set => ({
  step: 'select',
  token: null,
  amount: '',
  recipient: '',
  transactionHash: '',
  setStep: step => set({ step }),
  setToken: token => set({ token }),
  setAmount: amount => set({ amount }),
  setRecipient: recipient => set({ recipient }),
  setTransactionHash: hash => set({ transactionHash: hash }),
}));

export default useSendTokenStore;
