import { useEffect } from "react";
import useWalletStore from "./use-wallet-store";
import { STORAGE_KEYS } from "@/background/constants/storage-keys";

const useInit = () => {
    const { loading, hasWallet, initialized, loadWalletState } = useWalletStore();


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

    // Listen for lock state changes from background script
    useEffect(() => {
        function handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
            if (areaName !== 'local') return;
            if (changes[STORAGE_KEYS.SESSION_IS_LOCKED]) {
                // Refresh wallet state when lock state flag updates
                loadWalletState();
            }
        }

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, [loadWalletState]);
};

export default useInit;