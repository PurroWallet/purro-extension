import { useEffect, useRef } from 'react';
import useWalletStore from './use-wallet-store';
import { STORAGE_KEYS } from '@/background/constants/storage-keys';

// Constants for easy customization
const ONBOARDING_CONFIG = {
  DEBOUNCE_DELAY: 500,
  WINDOW_CHECK_INTERVAL: 1000,
  FALLBACK_RESET_DELAY: 5000,
} as const;

// Global flag to prevent multiple onboarding windows
let isOnboardingWindowOpen = false;

const useInit = () => {
  const { loading, hasWallet, initialized, loadWalletState } = useWalletStore();
  const onboardingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize wallet state on first load
    if (!initialized && !loading) {
      loadWalletState();
    }
  }, [initialized, loading, loadWalletState]);

  useEffect(() => {
    // Clear any existing timeout
    if (onboardingTimeoutRef.current) {
      clearTimeout(onboardingTimeoutRef.current);
    }

    // Handle onboarding flow after state is loaded
    const isOnboardingPage =
      window.location.pathname.includes('onboarding') ||
      window.location.href.includes('onboarding.html');
    const isImportPage =
      window.location.pathname.includes('import') ||
      window.location.href.includes('import.html');

    if (
      initialized &&
      !loading &&
      !hasWallet &&
      !isOnboardingPage &&
      !isImportPage &&
      !isOnboardingWindowOpen
    ) {
      // Debounce the onboarding window opening
      onboardingTimeoutRef.current = setTimeout(() => {
        if (!isOnboardingWindowOpen) {
          isOnboardingWindowOpen = true;

          const newWindow = window.open('onboarding.html', '_blank');

          // Reset flag when window is closed
          if (newWindow) {
            const checkClosed = setInterval(() => {
              if (newWindow.closed) {
                isOnboardingWindowOpen = false;
                clearInterval(checkClosed);
              }
            }, ONBOARDING_CONFIG.WINDOW_CHECK_INTERVAL);

            // Fallback reset
            setTimeout(() => {
              isOnboardingWindowOpen = false;
              clearInterval(checkClosed);
            }, ONBOARDING_CONFIG.FALLBACK_RESET_DELAY);
          } else {
            isOnboardingWindowOpen = false;
          }
        }
      }, ONBOARDING_CONFIG.DEBOUNCE_DELAY);
    }

    // Cleanup timeout on unmount
    return () => {
      if (onboardingTimeoutRef.current) {
        clearTimeout(onboardingTimeoutRef.current);
      }
    };
  }, [initialized, loading, hasWallet]);

  // Listen for storage changes
  useEffect(() => {
    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) {
      if (areaName !== 'local') return;

      const shouldRefresh = Object.keys(changes).some(
        key =>
          key.startsWith('purro:account') ||
          key.startsWith('purro:wallet') ||
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
