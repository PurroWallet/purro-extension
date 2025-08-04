import { create } from "zustand";
import { UserBalance } from "../types/hyperliquid-api";

interface SendTokenHLState {
  step: "select" | "send" | "confirm";
  token: UserBalance | null;
  amount: string;
  recipient: string;
  setStep: (step: "select" | "send" | "confirm") => void;
  setToken: (token: UserBalance | null) => void;
  setAmount: (amount: string) => void;
  setRecipient: (recipient: string) => void;
}

const useSendTokenHLStore = create<SendTokenHLState>((set) => ({
  step: "select",
  token: null,
  amount: "",
  recipient: "",
  setStep: (step) => set({ step }),
  setToken: (token) => set({ token }),
  setAmount: (amount) => set({ amount }),
  setRecipient: (recipient) => set({ recipient }),
}));

export default useSendTokenHLStore;
