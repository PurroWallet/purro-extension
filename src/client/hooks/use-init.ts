import { useEffect } from "react";
import useWalletStore from "./use-wallet-store";

const useInit = () => {
    const { loading, hasWallet, initialized, loadWalletState } = useWalletStore();
    console.log("loading", loading);
    console.log("hasWallet", hasWallet);
    console.log("initialized", initialized);

    useEffect(() => {
        // Initialize wallet state on first load
        if (!initialized && !loading) {
            loadWalletState();
        }
    }, [initialized, loading, loadWalletState]);

    useEffect(() => {
        // Handle onboarding flow after state is loaded
        if (initialized && !loading && !hasWallet) {
            window.open("onboarding.html", "_blank");
        }
    }, [initialized, loading, hasWallet]);
};

export default useInit;