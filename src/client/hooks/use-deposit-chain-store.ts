import { create } from 'zustand';

interface DepositChainState {
  step: 'input' | 'confirm' | 'pending' | 'success' | 'error';
  amount: string;
  txHash: string | null;
  error: string | null;
  isLoading: boolean;
  setStep: (step: 'input' | 'confirm' | 'pending' | 'success' | 'error') => void;
  setAmount: (amount: string) => void;
  setTxHash: (txHash: string | null) => void;
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  reset: () => void;
}

const useDepositChainStore = create<DepositChainState>(set => ({
  step: 'input',
  amount: '',
  txHash: null,
  error: null,
  isLoading: false,
  setStep: step => set({ step }),
  setAmount: amount => set({ amount }),
  setTxHash: txHash => set({ txHash }),
  setError: error => set({ error }),
  setIsLoading: isLoading => set({ isLoading }),
  reset: () =>
    set({
      step: 'input',
      amount: '',
      txHash: null,
      error: null,
      isLoading: false,
    }),
}));

export default useDepositChainStore;
