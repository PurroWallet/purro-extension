import { useMemo } from "react";
import { useHlPortfolioData } from "./use-hyperliquid-portfolio";
import { useNativeBalance, NativeToken } from "./use-native-balance";
import useNetworkSettingsStore from "@/client/hooks/use-network-store";
import { UnifiedToken } from "../components/token-list";
import { useAlchemyTokens } from "./use-alchemy-tokens";

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
}

export const useUnifiedTokens = (): UseUnifiedTokensResult => {
    const { isNetworkActive } = useNetworkSettingsStore();
    const isHyperliquidActive = isNetworkActive("hyperevm");

    // Fetch Hyperliquid EVM tokens only if Hyperliquid network is active
    const { evmData, isEvmLoading, evmError, evmValue } = useHlPortfolioData({
        fetchSpot: false,
        fetchPerps: false,
        fetchEvm: isHyperliquidActive,
    });

    // Fetch tokens from Ethereum, Base, Arbitrum with pricing
    const {
        allTokens: alchemyTokens,
        totalTokensCount: alchemyTokenCount,
        totalUsdValue: alchemyTotalValue,
        isLoading: isAlchemyLoading,
        hasError: hasAlchemyError,
    } = useAlchemyTokens();

    // Fetch native tokens
    const {
        nativeTokens,
        totalTokensCount: nativeTokensCount,
        totalUsdValue: nativeTotalValue,
        isLoading: isNativeLoading,
        hasError: hasNativeError,
    } = useNativeBalance();

    // Debug logging
    console.log('🔍 useUnifiedTokens - Native Tokens Debug:', {
        nativeTokensCount,
        nativeTokensLength: nativeTokens?.length || 0,
        nativeTotalValue,
        isNativeLoading,
        hasNativeError,
        nativeTokens: nativeTokens?.map(t => ({
            chain: t.chain,
            symbol: t.symbol,
            balance: t.balanceFormatted
        })) || []
    });

    // Safely access token prices data for Hyperliquid
    const tokenPricesData: TokenPricesData = evmData?.tokenPricesData || {};

    // Calculate individual values
    const hyperliquidValue = isEvmLoading || !isHyperliquidActive ? 0 : evmValue || 0;
    const safeAlchemyTotalValue = alchemyTotalValue || 0;
    const safeNativeTotalValue = nativeTotalValue || 0;

    // Calculate total balance
    const totalBalance = hyperliquidValue + safeAlchemyTotalValue + safeNativeTotalValue;

    // Calculate individual token counts
    const hyperliquidTokenCount = isHyperliquidActive ? evmData?.tokensData?.items?.length || 0 : 0;
    const totalTokenCount = hyperliquidTokenCount + alchemyTokenCount + nativeTokensCount;

    // Unify all tokens from all chains and sort by USD value
    const allUnifiedTokens = useMemo(() => {
        const unifiedTokens: UnifiedToken[] = [];

        // Add native tokens first (they will be sorted by value later)
        if (nativeTokens && Array.isArray(nativeTokens)) {
            console.log('🔍 Adding Native Tokens to Unified List:', nativeTokens.length);
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
        } else {
            console.log('🔍 No Native Tokens to Add:', { nativeTokens, isArray: Array.isArray(nativeTokens) });
        }

        // Add Hyperliquid tokens only if Hyperliquid network is active
        if (isHyperliquidActive && evmData?.tokensData?.items) {
            evmData.tokensData.items.forEach((item: EvmToken) => {
                // Add null checks for token properties
                if (!item?.token?.symbol || !item?.token?.address || !item?.value) {
                    return; // Skip invalid tokens
                }

                const balanceFormatted =
                    parseFloat(item.value) /
                    Math.pow(10, parseFloat(item.token.decimals || "18"));
                const tokenAddress = item.token.address.toLowerCase();
                const usdPrice = tokenPricesData[tokenAddress]
                    ? parseFloat(tokenPricesData[tokenAddress])
                    : 0;
                const usdValue = balanceFormatted * usdPrice;

                unifiedTokens.push({
                    chain: "hyperevm",
                    chainName: "HyperEVM",
                    symbol: item.token.symbol || "UNKNOWN",
                    name: item.token.name || "Unknown Token",
                    balance: item.value,
                    balanceFormatted,
                    usdValue,
                    usdPrice: usdPrice > 0 ? usdPrice : undefined,
                    contractAddress: item.token.address,
                    decimals: parseInt(item.token.decimals || "18"),
                    isNative: false, // HyperEVM ERC-20 tokens are not native
                });
            });
        }

        // Add Alchemy tokens (Ethereum, Base, Arbitrum)
        if (alchemyTokens && Array.isArray(alchemyTokens)) {
            alchemyTokens.forEach((token) => {
                // Add null checks for token properties
                if (!token?.symbol || !token?.contractAddress) {
                    return; // Skip invalid tokens
                }

                unifiedTokens.push({
                    chain: token.chain || "ethereum",
                    chainName: token.chainName || "Unknown Chain",
                    symbol: token.symbol || "UNKNOWN",
                    name: token.name || "Unknown Token",
                    balance: token.balance || "0",
                    balanceFormatted: token.balanceFormatted || 0,
                    usdValue: token.usdValue || 0,
                    usdPrice: token.usdPrice,
                    contractAddress: token.contractAddress,
                    decimals: token.decimals || 18,
                    isNative: false, // Alchemy ERC-20 tokens are not native
                });
            });
        }

        // Sort by USD value (highest to lowest), mixing native and non-native tokens
        return unifiedTokens.sort((a, b) => {
            // Priority: Always show HYPE (Hyperliquid native) at the top
            const isHype = (t: UnifiedToken) =>
                (t.symbol && t.symbol.toUpperCase() === "HYPE") ||
                (t.chain === "hyperevm" && t.isNative);

            const aIsHype = isHype(a);
            const bIsHype = isHype(b);
            if (aIsHype !== bIsHype) {
                return aIsHype ? -1 : 1;
            }

            // Sort by USD value first (highest to lowest)
            if (a.usdValue && b.usdValue) {
                return b.usdValue - a.usdValue;
            }
            if (a.usdValue && !b.usdValue) return -1;
            if (!a.usdValue && b.usdValue) return 1;

            // If no USD values, sort by chain and symbol with null checks
            if (a.chain && b.chain && a.chain !== b.chain) {
                return a.chain.localeCompare(b.chain);
            }

            // Sort by symbol with null checks
            if (a.symbol && b.symbol) {
                return a.symbol.localeCompare(b.symbol);
            }

            // Fallback: if one has symbol and other doesn't
            if (a.symbol && !b.symbol) return -1;
            if (!a.symbol && b.symbol) return 1;

            // Both don't have symbols, maintain order
            return 0;
        });
    }, [
        evmData?.tokensData?.items,
        alchemyTokens,
        nativeTokens,
        tokenPricesData,
        isHyperliquidActive,
    ]);

    // Check if any data is loading
    const isLoading = isEvmLoading || isAlchemyLoading || isNativeLoading;

    // More nuanced error handling - only show error if all data sources fail
    const hasError = !!evmError || !!hasAlchemyError || !!hasNativeError;
    const hasCriticalError =
        (!!evmError && isHyperliquidActive) ||
        (!!hasAlchemyError && !!hasNativeError) ||
        (!!hasAlchemyError && !isHyperliquidActive && !nativeTokens?.length);

    return {
        // Token data
        allUnifiedTokens,

        // Totals
        totalBalance,
        totalTokenCount,

        // Individual totals
        hyperliquidValue,
        alchemyTotalValue: safeAlchemyTotalValue,
        nativeTotalValue: safeNativeTotalValue,

        // Individual counts
        hyperliquidTokenCount,
        alchemyTokenCount,
        nativeTokensCount,

        // Loading states
        isLoading,
        isEvmLoading,
        isAlchemyLoading,
        isNativeLoading,

        // Error states
        hasError,
        hasCriticalError,
        evmError,
        hasAlchemyError,
        hasNativeError,

        // Network state
        isHyperliquidActive,
    };
}; 