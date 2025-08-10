import { create } from "zustand";

interface DepositTransferState {
  step: "transfer" | "success";
  amount: string;
  isFromSpot: boolean;
  setStep: (step: "transfer" | "success") => void;
  setAmount: (amount: string) => void;
  setIsFromSpot: (isFromSpot: boolean) => void;
}

const useDepositTransferStore = create<DepositTransferState>((set) => ({
  step: "transfer",
  amount: "",
  isFromSpot: false,
  setStep: (step) => set({ step }),
  setAmount: (amount) => set({ amount }),
  setIsFromSpot: (isFromSpot) => set({ isFromSpot }),
}));

export default useDepositTransferStore;
