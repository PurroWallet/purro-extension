import React from 'react';
import { Button } from '@/client/components/ui';
import useSwapStore from '@/client/hooks/use-swap-store';
import { useSwapRoute } from '@/client/hooks/use-swap-route';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useMainSwapStore from '@/client/hooks/use-main-swap-store';
import { SwapSuccess } from '@/client/components/dialogs';
import {
  getTokenBalance,
  isWrapScenario,
  isUnwrapScenario,
  getActionButtonText,
  validateSwap,
} from '@/client/utils/swap-utils';
import { executeSwapTransaction } from '@/client/utils/swap-transaction-handler';

const ConfirmSwapButton = () => {
  const { openDialog } = useDialogStore();
  const { swapError, setSwapError, clearSwapError } = useMainSwapStore();
  const { getActiveAccountWalletObject } = useWalletStore();

  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    route,
    isSwapping,
    setIsSwapping,
  } = useSwapStore();

  const { isLoading: isLoadingRoute, error: routeError } = useSwapRoute();
  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Validation
  const tokenInBalance = tokenIn ? getTokenBalance(tokenIn) : 0;
  const inputAmount = parseFloat(amountIn || '0');
  const hasInsufficientBalance = inputAmount > tokenInBalance;

  const isValidSwap = validateSwap(
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    hasInsufficientBalance,
    routeError,
    route
  );

  // Handle swap execution
  const handleSwap = async () => {
    if (
      !isValidSwap ||
      !activeAccountAddress ||
      !route ||
      !tokenIn ||
      !tokenOut
    )
      return;

    setIsSwapping(true);
    clearSwapError();

    try {
      const result = await executeSwapTransaction({
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        route,
        activeAccountAddress,
      });

      if (result.success) {
        // Show success dialog
        openDialog(
          <SwapSuccess
            transactionHash={result.data}
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            amountIn={amountIn}
            amountOut={amountOut}
            chainId={'0x3e7'}
          />
        );
      } else {
        setSwapError(result.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('❌ Swap failed:', error);
      setSwapError(
        error instanceof Error ? error.message : 'Transaction failed'
      );
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
            {isWrapScenario(tokenIn, tokenOut)
              ? 'Wrapping...'
              : isUnwrapScenario(tokenIn, tokenOut)
                ? 'Unwrapping...'
                : 'Swapping...'}
          </div>
        ) : !tokenIn || !tokenOut ? (
          'Select tokens'
        ) : !amountIn || !amountOut ? (
          'Enter amount'
        ) : hasInsufficientBalance ? (
          `Insufficient ${tokenIn.symbol} balance`
        ) : routeError ? (
          'No route available'
        ) : !route ? (
          'Finding best route...'
        ) : (
          getActionButtonText(tokenIn, tokenOut)
        )}
      </Button>
    </div>
  );
};

export default ConfirmSwapButton;
