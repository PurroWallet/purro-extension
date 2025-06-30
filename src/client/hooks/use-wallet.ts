import { useCallback } from "react";

import useWalletStore from './use-wallet-store';
import { sendMessage } from "../utils/extension-message-utils";
import { CreateWalletData } from "@/background/types/message-data";
import { ChainType } from "@/background/types/account";
import { SeedPhraseData } from "@/background/types/account";

const useWallet = () => {
    const { setLoading, setError } = useWalletStore();

    const createWallet = useCallback(async ({ password, mnemonic }: CreateWalletData) => {
        try {
            setLoading(true);
            setError(null);
            const account = await sendMessage("CREATE_WALLET", { password, mnemonic });
            return account;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError]);

    const createAccountFromSeedPhrase = useCallback(async ({ name, icon, seedPhraseId }: { name?: string, icon?: string, seedPhraseId: string }) => {
        try {
            setLoading(true);
            setError(null);
            const account = await sendMessage("CREATE_ACCOUNT_FROM_SEED_PHRASE", { name, icon, seedPhraseId });
            return account;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create account from seed phrase';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError]);

    const importPrivateKey = useCallback(async ({ privateKey, accountName, chain, password }: { privateKey: string, accountName: string, chain: string, password?: string }) => {
        try {
            setLoading(true);
            setError(null);
            const account = await sendMessage("IMPORT_PRIVATE_KEY", { privateKey, password, accountName, chain });
            return account;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
            setError(errorMessage);
            console.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError]);

    const importSeedPhrase = useCallback(async ({ mnemonic, accountName, password }: { mnemonic: string, accountName: string, password?: string }): Promise<string> => {
        try {
            setLoading(true);
            setError(null);
            const account = await sendMessage("IMPORT_SEED_PHRASE", { mnemonic, password, accountName });
            return account;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to import seed phrase';
            setError(errorMessage);
            console.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError]);

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

    const reorderAccounts = useCallback(async (orderedAccountIds: string[]) => {
        const reordered = await sendMessage("REORDER_ACCOUNTS", orderedAccountIds);
        return reordered;
    }, []);

    const setActiveAccount = useCallback(async (accountId: string) => {
        const active = await sendMessage("SET_ACTIVE_ACCOUNT", accountId);
        return active;
    }, []);

    const getSeedPhraseById = useCallback(async (seedPhraseId: string) => {
        const seedPhrase = await sendMessage("GET_SEED_PHRASE_BY_ID", seedPhraseId);
        return seedPhrase;
    }, []);

    const changeAccountName = useCallback(async (accountId: string, name: string) => {
        const changed = await sendMessage("CHANGE_ACCOUNT_NAME", { accountId, name });
        return changed;
    }, []);

    const changeAccountIcon = useCallback(async (accountId: string, icon: string) => {
        const changed = await sendMessage("CHANGE_ACCOUNT_ICON", { accountId, icon });
        return changed;
    }, []);

    const removeAccount = useCallback(async (accountId: string) => {
        const removed = await sendMessage("REMOVE_ACCOUNT", accountId);
        return removed;
    }, []);

    const exportSeedPhrase = useCallback(async (seedPhraseId: string, password: string) => {
        const exported = await sendMessage("EXPORT_SEED_PHRASE", { seedPhraseId, password });
        return exported;
    }, []);

    const exportPrivateKey = useCallback(async (privateKeyId: string, chain: ChainType, password: string) => {
        const exported = await sendMessage("EXPORT_PRIVATE_KEY", { privateKeyId, chain, password });
        return exported;
    }, []);

    const importWatchOnlyWallet = useCallback(async (address: string, chain: ChainType, accountName: string) => {
        const imported = await sendMessage("IMPORT_WATCH_ONLY_WALLET", { address, chain, accountName });
        return imported;
    }, []);

    const checkWatchOnlyAddressExists = useCallback(async (address: string) => {
        const exists = await sendMessage("IS_WATCH_ONLY_ADDRESS_EXISTS", { address });
        return exists;
    }, []);

    type SeedPhraseWithId = SeedPhraseData & { id: string };

    const getAllSeedPhrases = useCallback(async (): Promise<SeedPhraseWithId[]> => {
        const seedPhrases: { id: string; data: SeedPhraseData }[] = await sendMessage("GET_ALL_SEED_PHRASES");
        return seedPhrases.map((sp) => ({ id: sp.id, ...sp.data }));
    }, []);

    return {
        createWallet,
        createAccountFromSeedPhrase,
        importPrivateKey,
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
        exportPrivateKey,
        importWatchOnlyWallet,
        checkWatchOnlyAddressExists,
        getAllSeedPhrases
    }
};

export default useWallet;