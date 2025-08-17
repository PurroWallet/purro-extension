import { useMemo } from 'react';
import { Button, DialogContent, DialogFooter } from '@/client/components/ui';
import useDepositChainStore from '@/client/hooks/use-deposit-chain-store';
import { formatCurrency } from '@/client/utils/formatters';
import { sendMessage } from '@/client/utils/extension-message-utils';
import useDialogStore from '@/client/hooks/use-dialog-store';
import {
  BRIDGE_CONTRACT_ADDRESS,
  MIN_DEPOSIT_AMOUNT,
  USDC_CONTRACT_ADDRESS,
  ARBITRUM_CHAIN_ID,
} from './constants';
import { getNetworkIcon } from '@/client/utils/icons';
import { useAlchemyTokens } from '@/client/hooks/use-alchemy-tokens';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';

const InputAmount = () => {
  const { closeDialog } = useDialogStore();
  const {
    amount,
    setAmount,
    setStep,
    setError,
    setTxHash,
    isLoading,
    setIsLoading,
  } = useDepositChainStore();
  const { isNetworkActive } = useNetworkSettingsStore();

  // Check if Arbitrum network is enabled
  const isArbitrumActive = isNetworkActive('arbitrum');

  // Use existing Alchemy tokens hook to get USDC balance on Arbitrum
  const { allTokens, isLoading: isLoadingBalance } = useAlchemyTokens();

  // Find USDC token on Arbitrum
  const usdcBalance = useMemo(() => {
    const arbitrumUSDC = allTokens.find(
      token =>
        token.chain === 'arbitrum' &&
        (token.symbol.toLowerCase() === 'usdc' ||
          token.contractAddress.toLowerCase() ===
            '0xaf88d065e77c8cc2239327c5edb3a432268e5831')
    );

    return arbitrumUSDC?.balanceFormatted || 0;
  }, [allTokens]);

  const numAmount = useMemo(() => {
    return parseFloat(amount) || 0;
  }, [amount]);

  const isValidAmount = useMemo(() => {
    if (!amount || isNaN(numAmount)) {
      return false;
    }
    return numAmount >= MIN_DEPOSIT_AMOUNT && numAmount <= usdcBalance;
  }, [amount, numAmount, usdcBalance]);

  const validationMessage = useMemo(() => {
    if (!amount) return null;
    if (isNaN(numAmount)) return 'Please enter a valid amount';
    if (numAmount < MIN_DEPOSIT_AMOUNT)
      return `Minimum deposit is ${MIN_DEPOSIT_AMOUNT} USDC`;
    if (numAmount > usdcBalance) return 'Insufficient USDC balance';
    return null;
  }, [amount, numAmount, usdcBalance]);

  const handleMaxClick = () => {
    if (usdcBalance > 0) {
      setAmount(usdcBalance.toString());
    }
  };

  // Helper function to encode ERC-20 transfer data
  const encodeTransferData = (to: string, amount: string): string => {
    // ERC-20 transfer function selector: transfer(address,uint256)
    const functionSelector = '0xa9059cbb';

    // Pad address to 32 bytes (64 hex chars) - remove 0x prefix
    const paddedAddress = to.replace('0x', '').toLowerCase().padStart(64, '0');

    // Convert amount to smallest unit (USDC has 6 decimals) and pad to 32 bytes
    const amountInSmallestUnit = Math.floor(parseFloat(amount) * 1000000); // 6 decimals for USDC
    const paddedAmount = amountInSmallestUnit.toString(16).padStart(64, '0');

    const encodedData = functionSelector + paddedAddress + paddedAmount;

    return encodedData;
  };

  const handleDeposit = async () => {
    if (!isValidAmount) return;

    try {
      setIsLoading(true);
      setError(null);

      // Encode the ERC-20 transfer data
      const transferData = encodeTransferData(BRIDGE_CONTRACT_ADDRESS, amount);

      // Prepare the transaction for EVM_SEND_TOKEN
      const transaction = {
        to: USDC_CONTRACT_ADDRESS, // USDC contract address on Arbitrum
        data: transferData,
        chainId: `0x${ARBITRUM_CHAIN_ID.toString(16)}`, // Convert to hex string
        value: '0x0', // No ETH value for ERC-20 transfer
      };

      const result = await sendMessage('EVM_SEND_TOKEN', {
        transaction,
      });

      if (result.success) {
        setTxHash(result.data); // result.data contains the transaction hash
        setStep('pending');
      } else {
        setError(result.error || 'Transaction failed');
        setStep('error');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      setError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DialogContent>
        <div className="flex flex-col gap-4">
          {/* Arbitrum Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/5">
              <img
                src={getNetworkIcon('arbitrum')}
                alt="Arbitrum"
                className="w-12 h-12 rounded-full"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Amount (USDC)
              </label>
            </div>

            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-[var(--card-color)] text-white placeholder-gray-400 pr-12 text-base transition-colors duration-200 ${
                  validationMessage
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-white/10 focus:ring-[var(--primary-color-light)]'
                }`}
                step="0.01"
                min={MIN_DEPOSIT_AMOUNT}
                disabled={isLoading}
              />
              <Button
                onClick={handleMaxClick}
                disabled={isLoadingBalance || usdcBalance === 0 || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/80"
              >
                Max
              </Button>
            </div>

            {/* Balance and Validation */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-400">
                Available:{' '}
                {!isArbitrumActive ? (
                  <span className="text-yellow-400">
                    Arbitrum network disabled
                  </span>
                ) : isLoadingBalance ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    {formatCurrency(usdcBalance, 2, 'USDC')}
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <span className="text-xs text-yellow-400 ml-2">
                        (Found{' '}
                        {allTokens.filter(t => t.chain === 'arbitrum').length}{' '}
                        Arbitrum tokens)
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Network warning */}
            {!isArbitrumActive && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-xs">
                  Please enable the Arbitrum network in settings to view your
                  USDC balance and make deposits.
                </p>
              </div>
            )}

            {validationMessage && (
              <p className="text-red-400 text-xs">{validationMessage}</p>
            )}
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button
          onClick={closeDialog}
          disabled={isLoading}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          Cancel
        </Button>
        <Button
          onClick={handleDeposit}
          disabled={
            !isValidAmount || isLoading || isLoadingBalance || !isArbitrumActive
          }
          className="flex-1"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Depositing...
            </>
          ) : (
            `Deposit`
          )}
        </Button>
      </DialogFooter>
    </>
  );
};

export default InputAmount;
