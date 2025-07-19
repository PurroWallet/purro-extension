import { UnifiedToken } from "@/client/components/token-list";
import { create } from "zustand";

interface SendTokenState {
    step: "select" | "send" | "confirm";
    token: UnifiedToken | null;
    amount: string;
    recipient: string;
    setStep: (step: "select" | "send" | "confirm") => void;
    setToken: (token: UnifiedToken | null) => void;
    setAmount: (amount: string) => void;
    setRecipient: (recipient: string) => void;
}

const useSendTokenStore = create<SendTokenState>((set) => ({
    step: "select",
    token: null,
    amount: "",
    recipient: "",
    setStep: (step) => set({ step }),
    setToken: (token) => set({ token }),
    setAmount: (amount) => set({ amount }),
    setRecipient: (recipient) => set({ recipient }),
}));

export default useSendTokenStore;