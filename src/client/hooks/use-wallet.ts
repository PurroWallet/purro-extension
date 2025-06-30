import { useCallback } from "react";

import useWalletStore from './use-wallet-store';
import { sendMessage } from "../utils/extension-message-utils";
import { CreateWalletData } from "@/background/types/message-data";
import { ChainType } from "@/background/types/account";

const useWallet = () => {
    const { setLoading, setError, loadWalletState } = useWalletStore();

    const createWallet = useCallback(async ({ password, mnemonic }: CreateWalletData) => {
        try {
            setLoading(true);
            setError(null);
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
        const unlocked = await sendMessage("UNLOCK_WALLET", { password });
        await loadWalletState();
        return unlocked;
    }, [loadWalletState]);

    const resetWallet = useCallback(async () => {
        const reset = await sendMessage("RESET_WALLET");
        await loadWalletState();
        return reset;
    }, [loadWalletState]);

    const lockWallet = useCallback(async () => {
        const locked = await sendMessage("LOCK_WALLET");
        await loadWalletState();
        return locked;
    }, [loadWalletState]);

    const reorderAccounts = useCallback(async (orderedAccountIds: string[]) => {
        const reordered = await sendMessage("REORDER_ACCOUNTS", orderedAccountIds);
        await loadWalletState();
        return reordered;
    }, [loadWalletState]);

    const setActiveAccount = useCallback(async (accountId: string) => {
        const active = await sendMessage("SET_ACTIVE_ACCOUNT", accountId);
        await loadWalletState();
        return active;
    }, [loadWalletState]);

    const getSeedPhraseById = useCallback(async (seedPhraseId: string) => {
        const seedPhrase = await sendMessage("GET_SEED_PHRASE_BY_ID", seedPhraseId);
        return seedPhrase;
    }, []);

    const changeAccountName = useCallback(async (accountId: string, name: string) => {
        const changed = await sendMessage("CHANGE_ACCOUNT_NAME", { accountId, name });
        await loadWalletState();
        return changed;
    }, [loadWalletState]);

    const changeAccountIcon = useCallback(async (accountId: string, icon: string) => {
        const changed = await sendMessage("CHANGE_ACCOUNT_ICON", { accountId, icon });
        await loadWalletState();
        return changed;
    }, [loadWalletState]);

    const removeAccount = useCallback(async (accountId: string) => {
        const removed = await sendMessage("REMOVE_ACCOUNT", accountId);
        await loadWalletState();
        return removed;
    }, [loadWalletState]);

    const exportSeedPhrase = useCallback(async (seedPhraseId: string, password: string) => {
        const exported = await sendMessage("EXPORT_SEED_PHRASE", { seedPhraseId, password });
        return exported;
    }, []);

    const exportPrivateKey = useCallback(async (privateKeyId: string, chain: ChainType, password: string) => {
        const exported = await sendMessage("EXPORT_PRIVATE_KEY", { privateKeyId, chain, password });
        return exported;
    }, []);

    return {
        createWallet,
        importWallet,
        importSeedPhrase,
        checkSeedPhraseExists,
        checkPrivateKeyExists,
        unlockWallet,
        resetWallet,
        lockWallet,
        reorderAccounts,
        setActiveAccount,
        getSeedPhraseById,
        changeAccountName,
        changeAccountIcon,
        removeAccount,
        exportSeedPhrase,
        exportPrivateKey
    }
};

export default useWallet;