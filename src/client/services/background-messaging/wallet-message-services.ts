import { WalletState } from "@/types";
import { sendMessage } from "./extension-message-utils";

export const walletMessageServices = {
    getWalletState: async (): Promise<WalletState> => {
        const response = await sendMessage("GET_WALLET_STATE");
        return response;
    }
}