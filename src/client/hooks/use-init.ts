import { useEffect } from 'react';
import useWalletStore from './use-wallet-store';
import { STORAGE_KEYS } from '@/background/constants/storage-keys';

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
      window.open('onboarding.html', '_blank');
    }
  }, [initialized, loading, hasWallet]);

  // Listen for lock state changes from background script
  useEffect(() => {
    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) {
      if (areaName !== 'local') return;
      // Refresh when any Purro storage key that may affect wallet state changes
      const shouldRefresh = Object.keys(changes).some(
        key =>
          // Generic prefixes for account / wallet related keys
          key.startsWith('purro:account') ||
          key.startsWith('purro:wallet') ||
          // Explicit keys we rely on
          key === STORAGE_KEYS.ACCOUNTS ||
          key === STORAGE_KEYS.ACCOUNT_ACTIVE_ACCOUNT ||
          key === STORAGE_KEYS.SESSION_IS_LOCKED
      );

      if (shouldRefresh) {
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
