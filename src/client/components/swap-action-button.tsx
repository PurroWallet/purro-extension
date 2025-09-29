import { useCallback } from 'react';
import { Button } from '@/client/components/ui';
import useSwapStore from '@/client/hooks/use-swap-store';
import { useSwapRoute } from '@/client/hooks/use-swap-route';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useMainSwapStore from '@/client/hooks/use-main-swap-store';
import { SwapSuccess } from '@/client/components/dialogs';
import {
  validateSwap,
  hasEnoughBalanceWithGas,
  estimateGasCost,
  getActionButtonText,
  getMaxSpendableBalance,
} from '@/client/utils/swap-utils';
import { executeSwapTransaction } from '@/client/utils/swap-transaction-handler';
import { useHyperEvmTokens } from '@/client/hooks/use-hyper-evm-tokens';
import { useNativeBalance } from '@/client/hooks/use-native-balance';
import { useUnifiedTokens } from '@/client/hooks/use-unified-tokens';
import { UnifiedToken } from '@/client/components/token-list';

// Constants for easy customization
const ERROR_CONFIG = {
  SHOW_DETAILED_ERRORS: false,
  USER_REJECTION_KEYWORDS: [
    'user rejected',
    'User denied',
    'user denied transaction',
  ],
  GENERIC_MESSAGE: 'Transaction failed. Please try again.',
} as const;

// Helper function to format error messages
const formatErrorMessage = (error: string | null): string => {
  if (!error) return ERROR_CONFIG.GENERIC_MESSAGE;

  // Always log the full error for debugging
  console.error('[Purro] 🔍 Full error message:', error);

  // Keep user rejection messages as is
  const isUserRejection = ERROR_CONFIG.USER_REJECTION_KEYWORDS.some(keyword =>
    error.toLowerCase().includes(keyword.toLowerCase())
  );

  if (isUserRejection) {
    return error;
  }

  // Show detailed errors in development or if configured to do so
  if (ERROR_CONFIG.SHOW_DETAILED_ERRORS) {
    return error;
  }

  // Use generic message for other errors in production
  return ERROR_CONFIG.GENERIC_MESSAGE;
};

const ConfirmSwapButton = () => {
  const { openDialog } = useDialogStore();
  const { swapError, setSwapError, clearSwapError } = useMainSwapStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  const { refetchTokenData } = useHyperEvmTokens();
  const { nativeTokens } = useNativeBalance();
  const { refetchAll: refetchAllTokens } = useUnifiedTokens();

  const {
    tokenIn,
    tokenOut,
    inputAmount,
    outputAmount,
    route,
    isSwapping,
    setIsSwapping,
    reset,
  } = useSwapStore();

  const {
    isLoading: isLoadingRoute,
    error: routeError,
    isWrapScenario,
    isUnwrapScenario,
  } = useSwapRoute();
  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Function to get updated native HYPE token data
  const getNativeHypeWithBalance = useCallback(
    (baseToken: UnifiedToken) => {
      const nativeHypeToken = nativeTokens.find(
        token => token.chain === 'hyperevm' && token.symbol === 'HYPE'
      );

      if (
        nativeHypeToken &&
        baseToken.isNative &&
        baseToken.symbol === 'HYPE'
      ) {
        return {
          ...baseToken,
          balance: nativeHypeToken.balance,
          balanceFormatted: nativeHypeToken.balanceFormatted,
          usdValue: nativeHypeToken.usdValue || 0,
          usdPrice: nativeHypeToken.usdPrice,
        };
      }
      return baseToken;
    },
    [nativeTokens]
  );

  // Validation
  // Enhanced balance validation that considers gas fees for native tokens
  const nativeTokenIn = tokenIn ? getNativeHypeWithBalance(tokenIn) : null;
  const gasEst = tokenIn ? estimateGasCost(tokenIn, 'swap') : undefined;

  // Detect if current amount equals max spendable (gas already reserved)
  let gasAlreadyDeducted = false;
  if (nativeTokenIn && inputAmount) {
    const maxAmt = getMaxSpendableBalance(nativeTokenIn, {
      reserveGas: true,
      customGasEstimate: gasEst,
    });
    const a = parseFloat(inputAmount);
    const m = parseFloat(maxAmt);
    if (isFinite(a) && isFinite(m) && m > 0) {
      gasAlreadyDeducted = Math.abs(a - m) < m * 0.000001; // 0.0001% tolerance
    }
  }

  const balanceCheck = hasEnoughBalanceWithGas(
    nativeTokenIn,
    inputAmount,
    gasEst,
    gasAlreadyDeducted
  );

  const hasInsufficientBalance = !balanceCheck.hasEnough;

  const isValidSwap = validateSwap(
    tokenIn,
    tokenOut,
    inputAmount,
    outputAmount,
    hasInsufficientBalance,
    routeError,
    route
  );

  // Handle swap execution
  const handleSwap = async () => {
    if (!isValidSwap || !activeAccountAddress || !tokenIn || !tokenOut) return;

    if (!route && !isWrapScenario() && !isUnwrapScenario()) return;

    setIsSwapping(true);
    clearSwapError();

    try {
      const result = await executeSwapTransaction({
        tokenIn,
        tokenOut,
        amountIn: inputAmount,
        route,
      });

      if (result.success && result.data) {
        // Reset swap amounts and route for next swap
        reset();

        // Refetch all token balances to show updated amounts across all chains
        refetchAllTokens();
        refetchTokenData();

        // Show success dialog
        openDialog(
          <SwapSuccess
            transactionHash={result.data}
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            amountIn={inputAmount}
            amountOut={outputAmount}
            chainId={'0x3e7'}
          />
        );
      } else {
        setSwapError(
          formatErrorMessage(
            result.error || 'Transaction failed - no transaction hash received'
          )
        );
      }
    } catch (error) {
      console.error('❌ Swap failed:', error);
      const errorMessage = error instanceof Error ? error.message : null;
      setSwapError(formatErrorMessage(errorMessage));
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="space-y-3">
      {swapError && (
        <div className="bg-[var(--button-color-destructive)]/10 border border-[var(--button-color-destructive)]/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--button-color-destructive)]">
              {swapError}
            </span>
          </div>
        </div>
      )}

      <Button
        onClick={handleSwap}
        disabled={!isValidSwap || isSwapping || isLoadingRoute}
        variant="primary"
        className="w-full font-medium py-4 text-lg"
      >
        {isSwapping ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            {isWrapScenario()
              ? 'Wrapping...'
              : isUnwrapScenario()
                ? 'Unwrapping...'
                : 'Swapping...'}
          </div>
        ) : !tokenIn || !tokenOut ? (
          'Select tokens'
        ) : !inputAmount || !outputAmount ? (
          'Enter amount'
        ) : hasInsufficientBalance ? (
          `Insufficient ${tokenIn.symbol} balance`
        ) : routeError ? (
          'No route available'
        ) : !route && !isWrapScenario() && !isUnwrapScenario() ? (
          'Finding best route...'
        ) : (
          getActionButtonText(tokenIn, tokenOut)
        )}
      </Button>
    </div>
  );
};

export default ConfirmSwapButton;
