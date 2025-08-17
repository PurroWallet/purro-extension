import { useMemo } from 'react';
import { useHlPortfolioData } from './use-hyperliquid-portfolio';
import { useNativeBalance, NativeToken } from './use-native-balance';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import { UnifiedToken } from '../components/token-list';
import { useAlchemyTokens } from './use-alchemy-tokens';
import useDevModeStore from './use-dev-mode';
import { useUnifiedTokensTestnet } from './use-unified-tokens-testnet';

export interface EvmToken {
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: string;
    icon_url: string | null;
    isNative: boolean;
  };
  value: string;
}

export interface TokenPricesData {
  [key: string]: string;
}

export interface UseUnifiedTokensResult {
  // Token data
  allUnifiedTokens: UnifiedToken[];

  // Totals
  totalBalance: number;
  totalTokenCount: number;

  // Individual totals
  hyperliquidValue: number;
  alchemyTotalValue: number;
  nativeTotalValue: number;

  // Individual counts
  hyperliquidTokenCount: number;
  alchemyTokenCount: number;
  nativeTokensCount: number;

  // Loading states
  isLoading: boolean;
  isEvmLoading: boolean;
  isAlchemyLoading: boolean;
  isNativeLoading: boolean;

  // Error states
  hasError: boolean;
  hasCriticalError: boolean;
  evmError: any;
  hasAlchemyError: boolean;
  hasNativeError: boolean;

  // Network state
  isHyperliquidActive: boolean;

  // Refetch functions
  refetchAll: () => void;
  refetchAlchemy: () => void;
  refetchNative: () => void;
  refetchHyperliquid: () => void;
}

export const useUnifiedTokens = (): UseUnifiedTokensResult => {
  const { isDevMode } = useDevModeStore();

  // Always call all hooks in the same order
  const testnetResult = useUnifiedTokensTestnet();
  const { isNetworkActive } = useNetworkSettingsStore();
  const isHyperliquidActive = isNetworkActive('hyperevm');

  const { evmData, isEvmLoading, evmError, evmValue, refetchEvm } = useHlPortfolioData({
    fetchSpot: false,
    fetchPerps: false,
    fetchEvm: isHyperliquidActive && !isDevMode,
  });

  const {
    allTokens: alchemyTokens,
    totalTokensCount: alchemyTokenCount,
    totalUsdValue: alchemyTotalValue,
    isLoading: isAlchemyLoading,
    hasError: hasAlchemyError,
    refetch: refetchAlchemyTokens,
  } = useAlchemyTokens();

  const {
    nativeTokens,
    totalTokensCount: nativeTokensCount,
    totalUsdValue: nativeTotalValue,
    isLoading: isNativeLoading,
    hasError: hasNativeError,
    refetch: refetchNativeTokens,
  } = useNativeBalance();

  const tokenPricesData: TokenPricesData = evmData?.tokenPricesData || {};

  const hyperliquidValue =
    isEvmLoading || !isHyperliquidActive ? 0 : evmValue || 0;
  const safeAlchemyTotalValue = alchemyTotalValue || 0;
  const safeNativeTotalValue = nativeTotalValue || 0;

  const totalBalance =
    hyperliquidValue + safeAlchemyTotalValue + safeNativeTotalValue;

  const hyperliquidTokenCount = isHyperliquidActive
    ? evmData?.tokensData?.data?.tokens?.length || 0
    : 0;
  const totalTokenCount =
    hyperliquidTokenCount + alchemyTokenCount + nativeTokensCount;

  const allUnifiedTokens = useMemo(() => {
    const unifiedTokens: UnifiedToken[] = [];

    if (nativeTokens && Array.isArray(nativeTokens)) {
      nativeTokens.forEach((nativeToken: NativeToken) => {
        unifiedTokens.push({
          chain: nativeToken.chain,
          chainName: nativeToken.chainName,
          symbol: nativeToken.symbol,
          name: nativeToken.name,
          balance: nativeToken.balance,
          balanceFormatted: nativeToken.balanceFormatted,
          usdValue: nativeToken.usdValue || 0,
          usdPrice: nativeToken.usdPrice,
          contractAddress: nativeToken.contractAddress,
          decimals: nativeToken.decimals,
          isNative: true,
        });
      });
    }

    if (isHyperliquidActive && evmData?.tokensData?.data?.tokens) {
      evmData.tokensData.data.tokens.forEach((token: any) => {
        // Skip EVM HYPE token if we already have native HYPE token
        // This prevents duplicate HYPE tokens in the list
        if (token.symbol === 'HYPE' && token.token.toLowerCase().includes('native')) {
          return; // Skip this token
        }

        // Try both original address and lowercase for price lookup
        const tokenAddress = token.token.toLowerCase();
        const priceStr = tokenPricesData[tokenAddress] || tokenPricesData[token.token];
        const price = priceStr ? parseFloat(priceStr) : 0;
        const balance =
          parseFloat(token.balance) / Math.pow(10, token.decimals);
        const usdValue = balance * price;

        unifiedTokens.push({
          chain: 'hyperevm',
          chainName: 'HyperEVM',
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          balanceFormatted: balance,
          usdValue,
          usdPrice: price,
          contractAddress: token.token,
          decimals: token.decimals,
          isNative: token.token.toLowerCase().includes('native'),
          logo: undefined, // Liquidswap API doesn't provide icon_url
        });
      });
    }

    if (alchemyTokens && Array.isArray(alchemyTokens)) {
      alchemyTokens.forEach((token: any) => {
        unifiedTokens.push(token);
      });
    }

    // Sort by USD value (highest first)
    return unifiedTokens.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
  }, [
    nativeTokens,
    isHyperliquidActive,
    evmData?.tokensData?.data?.tokens,
    tokenPricesData,
    alchemyTokens,
  ]);

  // If dev mode, map from testnetResult but keep hooks order intact
  if (isDevMode) {
    return {
      allUnifiedTokens: testnetResult.allUnifiedTokens,
      totalBalance: testnetResult.totalBalance,
      totalTokenCount: testnetResult.totalTokenCount,
      hyperliquidValue: 0,
      alchemyTotalValue: 0,
      nativeTotalValue: testnetResult.totalBalance,
      hyperliquidTokenCount: 0,
      alchemyTokenCount: 0,
      nativeTokensCount: testnetResult.totalTokenCount,
      isLoading: testnetResult.isLoading,
      isEvmLoading: false,
      isAlchemyLoading: false,
      isNativeLoading: testnetResult.isLoading,
      hasError: testnetResult.hasError,
      hasCriticalError: testnetResult.hasCriticalError,
      evmError: null,
      hasAlchemyError: false,
      hasNativeError: testnetResult.hasError,
      isHyperliquidActive: true,
      // Refetch functions (dev mode uses testnet)
      refetchAll: () => {
        refetchNativeTokens();
      },
      refetchAlchemy: () => { }, // No alchemy in dev mode
      refetchNative: refetchNativeTokens,
      refetchHyperliquid: () => { },
    };
  }

  // Non-dev mode result
  return {
    allUnifiedTokens,
    totalBalance,
    totalTokenCount,
    hyperliquidValue,
    alchemyTotalValue: safeAlchemyTotalValue,
    nativeTotalValue: safeNativeTotalValue,
    hyperliquidTokenCount,
    alchemyTokenCount,
    nativeTokensCount,
    isLoading: isEvmLoading || isAlchemyLoading || isNativeLoading,
    isEvmLoading,
    isAlchemyLoading,
    isNativeLoading,
    hasError: !!(evmError || hasAlchemyError || hasNativeError),
    hasCriticalError: !!(
      evmError &&
      totalBalance === 0 &&
      allUnifiedTokens.length === 0
    ),
    evmError,
    hasAlchemyError,
    hasNativeError,
    isHyperliquidActive,
    // Refetch functions
    refetchAll: () => {
      refetchAlchemyTokens();
      refetchNativeTokens();
      if (isHyperliquidActive) {
        refetchEvm();
      }
    },
    refetchAlchemy: refetchAlchemyTokens,
    refetchNative: refetchNativeTokens,
    refetchHyperliquid: refetchEvm,
  };
};
