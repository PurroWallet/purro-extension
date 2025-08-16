import { UnifiedToken } from '@/client/components/token-list';

// Constants for HYPE/WHYPE detection
export const HYPE_NATIVE_IDENTIFIERS = ['HYPE', 'native', 'NATIVE'];
export const WHYPE_TOKEN_ADDRESS = '0x5555555555555555555555555555555555555555';
export const HYPE_DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

// Helper functions for swap logic
export const isHypeToken = (token: UnifiedToken | null): boolean => {
    if (!token) return false;
    return (
        token.isNative ||
        HYPE_NATIVE_IDENTIFIERS.includes(token.symbol) ||
        HYPE_NATIVE_IDENTIFIERS.includes(token.contractAddress) ||
        token.contractAddress === 'native' ||
        token.contractAddress === 'NATIVE' ||
        token.contractAddress === HYPE_DEAD_ADDRESS
    );
};

export const isWhypeToken = (token: UnifiedToken | null): boolean => {
    if (!token) return false;
    return (
        token.symbol === 'WHYPE' ||
        token.contractAddress?.toLowerCase() === WHYPE_TOKEN_ADDRESS.toLowerCase()
    );
};

export const getTokenBalance = (token: UnifiedToken | null): number => {
    if (!token?.balance) return 0;
    try {
        let balanceValue;
        if (typeof token.balance === 'string' && token.balance.startsWith('0x')) {
            balanceValue = BigInt(token.balance);
        } else {
            balanceValue = BigInt(token.balance || '0');
        }

        const decimals = token.decimals || 18;
        const divisor = BigInt(10) ** BigInt(decimals);

        const wholePart = balanceValue / divisor;
        const fractionalPart = balanceValue % divisor;

        return (
            Number(wholePart) + Number(fractionalPart) / Math.pow(10, decimals)
        );
    } catch (error) {
        console.warn('Error parsing token balance:', error, token);
        return 0;
    }
};

export const isWrapScenario = (tokenIn: UnifiedToken | null, tokenOut: UnifiedToken | null): boolean => {
    return isHypeToken(tokenIn) && isWhypeToken(tokenOut);
};

export const isUnwrapScenario = (tokenIn: UnifiedToken | null, tokenOut: UnifiedToken | null): boolean => {
    return isWhypeToken(tokenIn) && isHypeToken(tokenOut);
};

export const getActionButtonText = (tokenIn: UnifiedToken | null, tokenOut: UnifiedToken | null): string => {
    if (isWrapScenario(tokenIn, tokenOut)) {
        return 'Wrap';
    } else if (isUnwrapScenario(tokenIn, tokenOut)) {
        return 'Unwrap';
    } else {
        return 'Swap';
    }
};

export const validateSwap = (
    tokenIn: UnifiedToken | null,
    tokenOut: UnifiedToken | null,
    amountIn: string,
    amountOut: string,
    hasInsufficientBalance: boolean,
    routeError: any,
    route: any
): boolean => {
    return !!(
        tokenIn &&
        tokenOut &&
        amountIn &&
        amountOut &&
        !hasInsufficientBalance &&
        !routeError &&
        route
    );
}; 