import useDepositTransferStore from '@/client/hooks/use-deposit-transfer-store';
import {
  DialogWrapper,
  DialogHeader,
  DialogContent,
  DialogFooter,
  Button,
} from '@/client/components/ui';
import { ArrowDownUp, X } from 'lucide-react';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { useMemo, useState } from 'react';
import { useHlPortfolioData } from '@/client/hooks/use-hyperliquid-portfolio';
import { formatCurrency } from '@/client/utils/formatters';
import { sendMessage } from '@/client/utils/extension-message-utils';
import useDevModeStore from '@/client/hooks/use-dev-mode';

const Transfer = () => {
  const { isDevMode } = useDevModeStore();
  const { setStep, isFromSpot, amount, setIsFromSpot, setAmount } =
    useDepositTransferStore();
  const { closeDialog } = useDialogStore();
  const [isLoading, setIsLoading] = useState(false);
  const { spotData, isSpotLoading, perpsData, isPerpsLoading, refetchAll } =
    useHlPortfolioData({
      fetchSpot: true, // Only fetch if Hyperliquid DEX is enabled
      fetchPerps: true,
      fetchEvm: false,
    });

  const spotBalance = useMemo(() => {
    if (isSpotLoading) return 0;

    const usdcBalance = spotData.balances.find(token => {
      return token.coin.toUpperCase() === 'USDC';
    });

    return usdcBalance?.total || 0;
  }, [spotData, isSpotLoading]);

  const perpBalance = useMemo(() => {
    if (isPerpsLoading) return '0';

    return perpsData?.withdrawable.toString() || '0';
  }, [spotData, isSpotLoading]);

  const isValidAmount = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) {
      return false;
    }

    const numAmount = parseFloat(amount);

    if (isFromSpot) {
      return numAmount > 0 && numAmount <= spotBalance;
    } else {
      return numAmount > 0 && numAmount <= perpBalance;
    }
  }, [amount]);

  const handleMaxClick = () => {
    if (!spotData && perpsData) return;

    if (isFromSpot) {
      setAmount(spotBalance.toString());
    } else {
      setAmount(perpBalance);
    }
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const result = await sendMessage(
        'HYPERLIQUID_TRANSFER_BETWEEN_SPOT_AND_PERP',
        {
          amount,
          fromSpot: isFromSpot,
          isDevMode: isDevMode,
        }
      );

      if (result.success) {
        setStep('success');
      } else {
        console.error('Error sending transfer message:', result.error);
      }
    } catch (error) {
      console.error('Error sending transfer message:', error);
    } finally {
      refetchAll();
      setIsLoading(false);
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Transfer USDC"
        onClose={closeDialog}
        icon={<X className="size-4" />}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 relative">
            <div className="flex flex-col gap-2 w-full rounded-lg bg-[var(--card-color)] px-4 pb-4 pt-2">
              <p>from</p>
              <div className="text-lg text-[var(--primary-color-light)]">
                {isFromSpot ? 'Hyperliquid Spot' : 'Hyperliquid Perps'}
              </div>
            </div>
            <div className="absolute rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--background-color)] p-2">
              <Button
                className="rounded-full w-fit h-fit p-2"
                onClick={() => setIsFromSpot(!isFromSpot)}
              >
                <ArrowDownUp />
              </Button>
            </div>
            <div className="flex flex-col gap-2 w-full rounded-lg bg-[var(--card-color)] px-4 pt-4 pb-2">
              <p>to</p>
              <div className="text-lg text-[var(--primary-color-light)]">
                {isFromSpot ? 'Hyperliquid Perps' : 'Hyperliquid Spot'}
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Amount
              </label>
            </div>

            {/* Input field with Max button */}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={'0.00'}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-[var(--card-color)] text-white placeholder-gray-400 pr-12 text-base transition-colors duration-200 ${
                  amount && !isValidAmount
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-white/10 focus:ring-[var(--primary-color-light)]'
                }`}
                step={'0.01'}
                min="0"
              />
              <Button
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/80"
              >
                Max
              </Button>
            </div>

            {/* Conversion and Available Balance */}
            <div className="flex items-center justify-end text-sm text-gray-400">
              <span>
                Available:{' '}
                {formatCurrency(
                  isFromSpot ? spotBalance : perpBalance,
                  2,
                  'USDC'
                )}
              </span>
            </div>

            {/* Validation message */}
            {amount && !isValidAmount && (
              <p className="text-red-400 text-xs">
                {`Insufficient balance. Max: ${formatCurrency(
                  isFromSpot ? spotBalance : perpBalance
                )}`}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={closeDialog}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          Cancel
        </Button>
        <Button onClick={handleSend} className="flex-1" disabled={isLoading}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            'Confirm'
          )}
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default Transfer;
