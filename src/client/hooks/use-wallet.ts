import { useCallback } from "react";

import useWalletStore from './use-wallet-store';
import { sendMessage } from "../services/background-messaging/extension-message-utils";
import { CreateWalletData } from "@/background/types/message-data";

const useWallet = () => {
    const { setLoading, setError, loadWalletState } = useWalletStore();

    const createWallet = useCallback(async ({ password, mnemonic }: CreateWalletData) => {
        try {
            setLoading(true);
            setError(null);
            console.log("createWallet", { password, mnemonic });
            const account = await sendMessage("CREATE_WALLET", { password, mnemonic });
            await loadWalletState();
            return account;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [loadWalletState, setLoading, setError]);

    const importWallet = useCallback(async ({ privateKey, accountName, chain, password }: { privateKey: string, accountName: string, chain: string, password?: string }) => {
        try {
            setLoading(true);
            setError(null);
            const account = await sendMessage("IMPORT_PRIVATE_KEY", { privateKey, password, accountName, chain });
            await loadWalletState(); // Refresh state
            return account;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
            setError(errorMessage);
            console.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [loadWalletState, setLoading, setError]);

    const importSeedPhrase = useCallback(async ({ privateKey, accountName, password }: { privateKey: string, accountName: string, password?: string }) => {
        try {
            setLoading(true);
            setError(null);
            const account = await sendMessage("IMPORT_SEED_PHRASE", { privateKey, password, accountName });
            await loadWalletState();
            return account;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to import seed phrase';
            setError(errorMessage);
            console.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [loadWalletState, setLoading, setError]);

    const checkSeedPhraseExists = useCallback(async (seedPhrase: string) => {
        const exists = await sendMessage("IS_SEED_PHRASE_EXISTS", { seedPhrase });
        return exists;
    }, []);

    const checkPrivateKeyExists = useCallback(async (privateKey: string) => {
        const exists = await sendMessage("IS_PRIVATE_KEY_EXISTS", { privateKey });
        return exists;
    }, []);

    const unlockWallet = useCallback(async (password: string) => {
        console.log("unlockWallet", password);
        const unlocked = await sendMessage("UNLOCK_WALLET", { password });
        return unlocked;
    }, []);

    const resetWallet = useCallback(async () => {
        const reset = await sendMessage("RESET_WALLET");
        return reset;
    }, []);

    const lockWallet = useCallback(async () => {
        const locked = await sendMessage("LOCK_WALLET");
        return locked;
    }, []);

    return {
        createWallet,
        importWallet,
        importSeedPhrase,
        checkSeedPhraseExists,
        checkPrivateKeyExists,
        unlockWallet,
        resetWallet,
        lockWallet
    }
};

export default useWallet;