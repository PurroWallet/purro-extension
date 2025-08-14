import { useState, useEffect, useMemo } from 'react';
import useDevModeStore from './use-dev-mode';
import useWalletStore from './use-wallet-store';
import useTestnetTokensStore, {
  TestnetToken,
} from './use-testnet-tokens-store';
import { UnifiedToken } from '../components/token-list';
import {
  getTestnetNativeBalance,
  getTestnetTokenBalance,
} from '../utils/testnet-rpc';

export interface UseUnifiedTokensTestnetResult {
  // Token data
  allUnifiedTokens: UnifiedToken[];

  // Totals
  totalBalance: number;
  totalTokenCount: number;

  // Loading states
  isLoading: boolean;
  hasError: boolean;
  hasCriticalError: boolean;

  // Actions
  addToken: (
    token: Omit<TestnetToken, 'balance' | 'balanceFormatted' | 'usdValue'>
  ) => void;
  removeToken: (address: string) => void;
  updateTokenBalance: (
    address: string,
    balance: string,
    balanceFormatted: number,
    usdValue?: number,
    usdPrice?: number
  ) => void;
}

export const useUnifiedTokensTestnet = (): UseUnifiedTokensTestnetResult => {
  try {
    const { isDevMode } = useDevModeStore();
    const { getActiveAccountWalletObject } = useWalletStore();
    const {
      tokens,
      addToken,
      removeToken,
      updateTokenBalance,
      getTotalValue,
      getTokenCount,
    } = useTestnetTokensStore();

    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Get wallet address
    const walletAddress = useMemo(() => {
      try {
        if (!isDevMode) return null;
        const wallet = getActiveAccountWalletObject();
        const address = wallet?.eip155?.address || null;

        // Only log when address changes or dev mode changes
        if (address) {
          console.log(
            '🔍 Testnet wallet address:',
            address.substring(0, 8) + '...'
          );
        }

        return address;
      } catch (error) {
        console.error('Error getting wallet address:', error);
        return null;
      }
    }, [isDevMode, getActiveAccountWalletObject]);

    // Stable token count reference
    const tokensCount = useMemo(() => {
      try {
        return tokens && Array.isArray(tokens) ? tokens.length : 0;
      } catch (error) {
        console.error('Error getting tokens count:', error);
        return 0;
      }
    }, [tokens]);

    // Fetch balances from testnet RPC
    useEffect(() => {
      try {
        if (!isDevMode || !walletAddress || !tokens || tokensCount === 0) {
          return;
        }

        const updateBalances = async () => {
          try {
            console.log(
              '🚀 Updating testnet balances for',
              tokensCount,
              'tokens...'
            );
            setIsLoading(true);
            setHasError(false);

            // Update all token balances
            await Promise.all(
              tokens.map(async token => {
                try {
                  if (token.isNative) {
                    // Get native HYPE balance
                    const { balance, balanceFormatted } =
                      await getTestnetNativeBalance(walletAddress);
                    console.log(
                      `✅ ${token.symbol}:`,
                      balanceFormatted,
                      'HYPE'
                    );
                    updateTokenBalance(
                      token.address,
                      balance,
                      balanceFormatted,
                      0,
                      0
                    );
                  } else {
                    // Get ERC-20 token balance
                    const { balance, balanceFormatted } =
                      await getTestnetTokenBalance(
                        token.address,
                        walletAddress,
                        token.decimals
                      );
                    console.log(`✅ ${token.symbol}:`, balanceFormatted);
                    updateTokenBalance(
                      token.address,
                      balance,
                      balanceFormatted,
                      0,
                      0
                    );
                  }
                } catch (error) {
                  console.error(
                    `❌ Failed to get ${token.symbol} balance:`,
                    error instanceof Error ? error.message : String(error)
                  );
                }
              })
            );
            console.log('🎉 Testnet balance update completed');
          } catch (error) {
            console.error('❌ Testnet balance update failed:', error);
            setHasError(true);
          } finally {
            setIsLoading(false);
          }
        };

        updateBalances();
      } catch (error) {
        console.error('Error in useEffect:', error);
        setHasError(true);
      }
    }, [isDevMode, walletAddress, tokensCount, updateTokenBalance]);

    // Convert testnet tokens to unified tokens format
    const allUnifiedTokens = useMemo(() => {
      try {
        // Add safeguard for undefined tokens
        if (!tokens || !Array.isArray(tokens)) {
          return [];
        }

        const unifiedTokens: UnifiedToken[] = tokens.map(token => ({
          chain: 'hyperevm-testnet' as const,
          chainName: 'HyperEVM Testnet',
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          balanceFormatted: token.balanceFormatted,
          usdValue: token.usdValue || 0,
          usdPrice: token.usdPrice || 0,
          contractAddress: token.address,
          decimals: token.decimals,
          isNative: token.isNative || false,
          icon_url: token.icon_url || undefined,
        }));

        return unifiedTokens;
      } catch (error) {
        console.error('Error converting tokens to unified format:', error);
        return [];
      }
    }, [tokens]);

    // Calculate totals with safeguards
    const totalBalance = useMemo(() => {
      try {
        return getTotalValue();
      } catch (error) {
        console.error('Error getting total value:', error);
        return 0;
      }
    }, [getTotalValue]);

    const totalTokenCount = useMemo(() => {
      try {
        return getTokenCount();
      } catch (error) {
        console.error('Error getting token count:', error);
        return 0;
      }
    }, [getTokenCount]);

    return {
      // Token data
      allUnifiedTokens,

      // Totals
      totalBalance,
      totalTokenCount,

      // Loading states
      isLoading,
      hasError,
      hasCriticalError: hasError,

      // Actions
      addToken,
      removeToken,
      updateTokenBalance,
    };
  } catch (error) {
    console.error('Critical error in useUnifiedTokensTestnet:', error);
    // Return safe fallback state
    return {
      allUnifiedTokens: [],
      totalBalance: 0,
      totalTokenCount: 0,
      isLoading: false,
      hasError: true,
      hasCriticalError: true,
      addToken: () => {},
      removeToken: () => {},
      updateTokenBalance: () => {},
    };
  }
};
