import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from '@/client/components/ui';
import { DialogHeader } from '@/client/components/ui';
import useSendTokenStore from '@/client/hooks/use-send-token-store';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { sendMessage } from '@/client/utils/extension-message-utils';
import { convertToWeiHex } from '@/client/utils/formatters';
import { useEffect, useState } from 'react';
import useDialogStore from '@/client/hooks/use-dialog-store';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  AlertTriangle,
  X,
  CircleAlert,
  Pen,
} from 'lucide-react';
import { getNetworkIcon } from '@/utils/network-icons';
import { getAddressByDomain } from '@/client/services/hyperliquid-name-api';
import {
  NativeToken,
  useNativeBalance,
} from '@/client/hooks/use-native-balance';
import TokenLogo from '@/client/components/token-logo';
import { ensureTokenDecimals } from '@/client/utils/token-decimals';

type GasEstimate = {
  gasLimit: string;
  gasPrice: string;
  gasCostEth: string;
  gasCostUsd: string;
  totalCostUsd: string;
};

// Helper function to get chain ID from chain name
const getChainId = (chain: string): string => {
  switch (chain) {
    case 'ethereum':
      return '0x1';
    case 'base':
      return '0x2105';
    case 'arbitrum':
      return '0xa4b1';
    case 'hyperevm':
      return '0x3e7';
    default:
      return '0x1';
  }
};

// Real gas estimation function using the app's RPC infrastructure
const estimateGas = async (
  token: any,
  amount: string,
  recipient: string,
  senderAddress: string,
  nativeTokens: NativeToken[]
) => {
  try {
    console.log('🔍 Estimating gas for transaction:', {
      token: token.symbol,
      amount,
      recipient,
      senderAddress,
      chain: token.chain,
    });

    // Prepare transaction object
    let txObject: any;
    if (
      token.symbol === 'ETH' ||
      token.symbol === 'HYPE' ||
      token.contractAddress === 'native' ||
      token.contractAddress === 'NATIVE'
    ) {
      // Native token transfer (ETH, HYPE)
      txObject = {
        from: senderAddress,
        to: recipient,
        value: convertToWeiHex(amount), // Convert to wei hex
      };
    } else {
      // ERC-20 token transfer
      console.log('🔍 Ensuring token decimals for gas estimation...');
      const tokenDecimals = await ensureTokenDecimals(token);
      console.log(`✅ Token decimals confirmed: ${tokenDecimals}`);

      const transferMethodId = '0xa9059cbb';
      const paddedRecipient = recipient.slice(2).padStart(64, '0');
      const paddedAmount = Math.floor(
        parseFloat(amount) * Math.pow(10, tokenDecimals)
      )
        .toString(16)
        .padStart(64, '0');
      txObject = {
        from: senderAddress,
        to: token.contractAddress,
        data: transferMethodId + paddedRecipient + paddedAmount,
      };
    }

    console.log('📝 Transaction object:', txObject, getChainId(token.chain));

    // Get gas estimate
    const gasEstimateResponse = await sendMessage('EVM_ESTIMATE_GAS', {
      transaction: txObject,
      chainId: getChainId(token.chain),
    });

    console.log('⛽ Gas estimation response:', gasEstimateResponse);

    // Access the nested data properly (backend wraps response in data field)
    // First try the direct path, then fallback to nested path
    const estimateData =
      gasEstimateResponse.data || gasEstimateResponse.data?.data;
    console.log('📊 Estimate data:', estimateData);
    console.log('📊 Full response structure:', gasEstimateResponse);

    const gasLimit = parseInt(estimateData.gas, 16);

    // Handle both legacy and EIP-1559 transactions
    let effectiveGasPrice: number;
    let gasPriceGwei: number;

    if (estimateData.gasPrice) {
      // Legacy transaction (type 0x0)
      effectiveGasPrice = parseInt(estimateData.gasPrice, 16);
      console.log('📊 Using legacy gas pricing:', { effectiveGasPrice });
      gasPriceGwei = effectiveGasPrice / 1e9;
      console.log('📊 Using legacy gas pricing:', {
        effectiveGasPrice,
        gasPriceGwei,
      });
    } else if (estimateData.maxFeePerGas) {
      // EIP-1559 transaction (type 0x2)
      effectiveGasPrice = parseInt(estimateData.maxFeePerGas, 16);
      gasPriceGwei = effectiveGasPrice / 1e9;
      console.log('📊 Using EIP-1559 gas pricing:', {
        effectiveGasPrice,
        gasPriceGwei,
      });

      // Log additional EIP-1559 info if available
      if (estimateData.maxPriorityFeePerGas) {
        const priorityFeeGwei = Math.round(
          parseInt(estimateData.maxPriorityFeePerGas, 16) / 1e9
        );
        console.log(`💡 Priority fee: ${priorityFeeGwei} Gwei`);
      }
    } else {
      // Fallback if neither is available
      console.warn('⚠️ No gas price data in response, using fallback');
      console.log(
        '📊 Available keys in estimateData:',
        Object.keys(estimateData)
      );
      effectiveGasPrice = 20e9; // 20 Gwei fallback
      gasPriceGwei = 20;
    }

    // Calculate gas cost in ETH
    const gasCostWei = gasLimit * effectiveGasPrice;
    const gasCostEth = gasCostWei / 1e18;

    let nativeTokenPrice = 3000; // Default fallback

    const nativeToken = nativeTokens.find(
      (t: NativeToken) => t.chain === token.chain
    );
    nativeTokenPrice = nativeToken?.usdPrice || 3000;

    const gasCostUsd = gasCostEth * nativeTokenPrice;
    const tokenTotalCostUsd = parseFloat(amount) * (token.usdPrice || 0);
    const totalCostUsd = tokenTotalCostUsd + gasCostUsd;

    console.log('✅ Gas estimation successful:', {
      gasLimit,
      effectiveGasPrice,
      effectiveGasPriceGwei: effectiveGasPrice / 1e9,
      gasPriceGwei,
      gasCostEth,
      gasCostUsd,
      totalCostUsd,
      calculationCheck: {
        manualGasCostWei: gasLimit * effectiveGasPrice,
        manualGasCostEth: (gasLimit * effectiveGasPrice) / 1e18,
        returnedGasCostEth: gasCostEth,
        pricesMatch:
          Math.abs((gasLimit * effectiveGasPrice) / 1e18 - gasCostEth) <
          0.000001,
      },
    });

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPriceGwei.toString(), // Always return in Gwei
      gasCostEth: gasCostEth.toFixed(8),
      gasCostUsd: gasCostUsd.toFixed(6),
      totalCostUsd: totalCostUsd.toFixed(6),
      // Optional: include transaction type info
      transactionType: estimateData.type || 'unknown',
      isEIP1559: !!estimateData.maxFeePerGas,
    };
  } catch (error) {
    console.error('❌ Gas estimation failed:', error);

    // Fallback to estimated values if RPC fails
    const fallbackGasLimit = token.symbol === 'ETH' ? '21000' : '65000';
    const fallbackGasPrice = '20'; // 20 gwei
    const fallbackGasCostEth =
      (parseInt(fallbackGasLimit) * parseInt(fallbackGasPrice) * 1e9) / 1e18; // Convert gwei to ETH
    const fallbackGasCostUsd = fallbackGasCostEth * 3000;

    console.warn('⚠️ Using fallback gas estimation');
    const tokenTotalCostUsd = parseFloat(amount) * (token.usdPrice || 0);
    console.log('🔍 Token total cost USD:', tokenTotalCostUsd);
    return {
      gasLimit: fallbackGasLimit,
      gasPrice: fallbackGasPrice,
      gasCostEth: fallbackGasCostEth.toFixed(8),
      gasCostUsd: fallbackGasCostUsd.toFixed(6),
      totalCostUsd: (tokenTotalCostUsd + fallbackGasCostUsd).toFixed(6),
      transactionType: 'fallback',
      isEIP1559: false,
    };
  }
};

type GasPriority = 'slow' | 'standard' | 'fast' | 'rapid';

const GasFeeSelection = ({
  gasEstimate,
  setGasEstimate,
  gasPriority,
  setGasPriority,
  token,
  nativeTokens,
  amount,
}: {
  gasEstimate: GasEstimate;
  setGasEstimate: (gasEstimate: GasEstimate) => void;
  gasPriority: GasPriority;
  setGasPriority: (gasPriority: GasPriority) => void;
  token: any;
  nativeTokens: NativeToken[];
  amount: string;
}) => {
  const [gasOptions, setGasOptions] = useState<{
    [key in GasPriority]: {
      gasPrice: string;
      time: string;
      gasCostEth: string;
      gasCostUsd: string;
      totalCostUsd: string;
    };
  }>({
    slow: {
      gasPrice: '',
      time: '~30s',
      gasCostEth: '',
      gasCostUsd: '',
      totalCostUsd: '',
    },
    standard: {
      gasPrice: '',
      time: '~15s',
      gasCostEth: '',
      gasCostUsd: '',
      totalCostUsd: '',
    },
    fast: {
      gasPrice: '',
      time: '~10s',
      gasCostEth: '',
      gasCostUsd: '',
      totalCostUsd: '',
    },
    rapid: {
      gasPrice: '',
      time: '~5s',
      gasCostEth: '',
      gasCostUsd: '',
      totalCostUsd: '',
    },
  });

  function getOptimalGasPrice(priority: GasPriority, baseGasPrice: number) {
    // For Arbitrum and other L2s, use smaller multipliers since gas prices are already optimized
    const isL2 =
      token.chain === 'arbitrum' ||
      token.chain === 'base' ||
      token.chain === 'hyperevm';

    const multipliers = isL2
      ? {
          slow: 0.95,
          standard: 1.0,
          fast: 1.05,
          rapid: 1.1,
        }
      : {
          slow: 0.8,
          standard: 1.0,
          fast: 1.2,
          rapid: 1.5,
        };

    return baseGasPrice * multipliers[priority];
  }

  function calculateGasCosts(gasPriceGwei: number) {
    const gasLimit = parseInt(gasEstimate.gasLimit);
    const gasCostWei = gasLimit * (gasPriceGwei * 1e9);
    const gasCostEth = gasCostWei / 1e18;

    let nativeTokenPrice = 3000; // Default fallback
    const nativeToken = nativeTokens.find(
      (t: NativeToken) => t.chain === token.chain
    );
    nativeTokenPrice = nativeToken?.usdPrice || 3000;

    const gasCostUsd = gasCostEth * nativeTokenPrice;

    // Calculate token cost directly to avoid circular dependency
    const tokenAmount = parseFloat(amount || '0');
    const tokenPrice = token?.usdPrice || 0;
    const tokenTotalCostUsd = tokenAmount * tokenPrice;
    const totalCostUsd = tokenTotalCostUsd + gasCostUsd;

    return {
      gasCostEth: gasCostEth.toFixed(8),
      gasCostUsd: gasCostUsd.toFixed(6),
      totalCostUsd: totalCostUsd.toFixed(6),
    };
  }

  useEffect(() => {
    if (gasEstimate) {
      const baseGasPrice = parseFloat(gasEstimate.gasPrice); // Use parseFloat for decimal gas prices

      const newGasOptions = {} as typeof gasOptions;

      (Object.keys(gasOptions) as GasPriority[]).forEach(priority => {
        const adjustedGasPrice = getOptimalGasPrice(priority, baseGasPrice);
        const costs = calculateGasCosts(adjustedGasPrice);

        newGasOptions[priority] = {
          gasPrice: adjustedGasPrice.toString(),
          time: gasOptions[priority].time,
          ...costs,
        };
      });

      setGasOptions(newGasOptions);
    }
  }, [gasEstimate, token, nativeTokens]); // Added missing dependencies

  const handlePrioritySelect = (priority: GasPriority) => {
    setGasPriority(priority);
    const selectedOption = gasOptions[priority];

    // Update the gas estimate with the new values
    setGasEstimate({
      ...gasEstimate,
      gasPrice: selectedOption.gasPrice,
      gasCostEth: selectedOption.gasCostEth,
      gasCostUsd: selectedOption.gasCostUsd,
      totalCostUsd: selectedOption.totalCostUsd,
    });
  };

  return (
    <div className="mt-4 space-y-2 w-full">
      {(
        Object.entries(gasOptions) as [
          GasPriority,
          (typeof gasOptions)[GasPriority],
        ][]
      ).map(([priority, option]) => (
        <div
          key={priority}
          onClick={() => handlePrioritySelect(priority)}
          className={`p-3 rounded-lg border cursor-pointer transition-all ${
            gasPriority === priority
              ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10'
              : 'border-white/10 hover:border-white/20 bg-[var(--card-color)]'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  gasPriority === priority
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]'
                    : 'border-gray-400'
                }`}
              >
                {gasPriority === priority && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium capitalize">
                    {priority}
                  </span>
                  <span className="text-gray-400 text-sm">{option.time}</span>
                </div>
                <div className="text-gray-400 text-xs">
                  {parseFloat(option.gasPrice).toFixed(4)} gwei
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-medium">
                {option.gasCostEth}{' '}
                {token.chain === 'hyperevm' ? 'HYPE' : 'ETH'}
              </div>
              <div className="text-gray-400 text-sm">
                ≈ ${option.gasCostUsd}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ConfirmSend = () => {
  const { setStep, recipient, amount, token, setTransactionHash } =
    useSendTokenStore();
  const { closeDialog } = useDialogStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(true);
  const [addressDomain, setAddressDomain] = useState<string | null>(null);
  const { nativeTokens } = useNativeBalance();
  const [isHaveEnoughGasFee, setIsHaveEnoughGasFee] = useState(true);
  const [gasPriority, setGasPriority] = useState<GasPriority>('standard');
  const [gasRefreshCounter, setGasRefreshCounter] = useState(0);
  const [lastGasUpdate, setLastGasUpdate] = useState<number>(Date.now());
  const [refreshCountdown, setRefreshCountdown] = useState<number>(30);

  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;
  const isHLName = recipient.match(/^[a-zA-Z0-9]+\.hl$/);

  useEffect(() => {
    const checkDomain = async () => {
      const domain = await getAddressByDomain(recipient);
      setAddressDomain(domain);
    };

    if (recipient && isHLName) {
      checkDomain();
    }
  }, [recipient]);

  useEffect(() => {
    const performGasEstimation = async () => {
      if (token && amount && recipient && activeAccountAddress) {
        setIsEstimatingGas(true);
        if (isHLName && !addressDomain) {
          setIsEstimatingGas(false);
          return;
        }

        try {
          const estimate = await estimateGas(
            token,
            amount,
            addressDomain || recipient,
            activeAccountAddress,
            nativeTokens
          );
          setGasEstimate(estimate);
        } catch (error) {
          console.error('Failed to estimate gas:', error);
        } finally {
          setIsEstimatingGas(false);
        }
      }
    };

    performGasEstimation();
  }, [
    token,
    amount,
    recipient,
    activeAccountAddress,
    addressDomain,
    gasRefreshCounter,
  ]);

  useEffect(() => {
    if (gasEstimate && token) {
      const nativeToken = nativeTokens.find(
        (t: NativeToken) => t.chain === token.chain
      );

      const gasCostEth = parseFloat(gasEstimate.gasCostEth);
      const nativeTokenBalance = nativeToken?.balance
        ? parseFloat(BigInt(nativeToken.balance).toString()) / 1e18
        : 0;

      setIsHaveEnoughGasFee(gasCostEth <= nativeTokenBalance * 0.9);
    }
  }, [gasEstimate, token, nativeTokens]);

  // Auto refresh gas estimate every 30 seconds
  useEffect(() => {
    if (!token || !amount || !recipient || !activeAccountAddress) return;

    const GAS_REFRESH_INTERVAL = 30000; // 30 seconds

    const refreshInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastGasUpdate;

      // Only refresh if enough time has passed and we're not currently estimating
      if (timeSinceLastUpdate >= GAS_REFRESH_INTERVAL && !isEstimatingGas) {
        console.log('🔄 Auto-refreshing gas estimate...');
        setGasRefreshCounter(prev => prev + 1);
        setLastGasUpdate(Date.now());
      }
    }, GAS_REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [
    token,
    amount,
    recipient,
    activeAccountAddress,
    lastGasUpdate,
    isEstimatingGas,
  ]);

  // Update lastGasUpdate when gas estimation completes
  useEffect(() => {
    if (gasEstimate && !isEstimatingGas) {
      setLastGasUpdate(Date.now());
      setRefreshCountdown(30);
    }
  }, [gasEstimate, isEstimatingGas]);

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      const timeSinceUpdate = Math.floor((Date.now() - lastGasUpdate) / 1000);
      const newCountdown = Math.max(0, 30 - timeSinceUpdate);
      setRefreshCountdown(newCountdown);
    }, 1000);

    return () => clearInterval(timer);
  }, [lastGasUpdate]);

  const handleConfirmSend = async () => {
    if (token && recipient && amount && gasEstimate && activeAccountAddress) {
      setIsEstimatingGas(true);

      try {
        // Validate domain resolution for HL names
        if (isHLName && !addressDomain) {
          throw new Error('Failed to resolve HyperLiquid domain name');
        }

        const finalRecipient = addressDomain || recipient;

        // Build the transaction object
        let transactionData: any;

        // Calculate gas price in wei (from gwei)
        let gasPriceGwei = parseFloat(gasEstimate.gasPrice);

        // Fallback if gas price is 0 or invalid
        if (!gasPriceGwei || gasPriceGwei <= 0) {
          console.warn('⚠️ Invalid gas price, using fallback of 20 gwei');
          gasPriceGwei = 20;
        }

        // Add safety buffer to gas price (10% extra) to account for network changes
        const isL2 =
          token.chain === 'arbitrum' ||
          token.chain === 'base' ||
          token.chain === 'hyperevm';
        const bufferMultiplier = isL2 ? 1.1 : 1.2; // Smaller buffer for L2s
        gasPriceGwei = Math.ceil(gasPriceGwei * bufferMultiplier * 1000) / 1000; // Round to 3 decimals

        const gasPriceWei = Math.floor(gasPriceGwei * 1e9);
        const gasPriceHex = `0x${gasPriceWei.toString(16)}`;

        if (
          token.symbol === 'ETH' ||
          token.symbol === 'HYPE' ||
          token.contractAddress === 'native' ||
          token.contractAddress === 'NATIVE'
        ) {
          // Native token transfer (ETH, HYPE)
          // Use BigInt to avoid precision issues
          const amountFloat = parseFloat(amount);
          const valueInWei = BigInt(Math.floor(amountFloat * 1e18));

          // Check if user has enough native token balance
          const nativeToken = nativeTokens.find(
            (t: NativeToken) => t.chain === token.chain
          );
          const nativeBalance = nativeToken?.balance
            ? parseFloat(BigInt(nativeToken.balance).toString()) / 1e18
            : 0;

          if (nativeBalance < amountFloat) {
            throw new Error(
              `Insufficient ${token.symbol} balance. You have ${nativeBalance.toFixed(6)} ${token.symbol} but trying to send ${amountFloat} ${token.symbol}`
            );
          }

          transactionData = {
            type: 'eth_sendTransaction',
            from: activeAccountAddress,
            to: finalRecipient,
            value: `0x${valueInWei.toString(16)}`,
            gas: `0x${parseInt(gasEstimate.gasLimit).toString(16)}`,
            gasPrice: gasPriceHex,
            chainId: getChainId(token.chain),
          };
        } else {
          // ERC-20 token transfer
          console.log('🔍 Ensuring token decimals for transaction...');
          const tokenDecimals = await ensureTokenDecimals(token);
          console.log(`✅ Using ${tokenDecimals} decimals for transaction`);

          const transferMethodId = '0xa9059cbb';

          // FIXED: Use finalRecipient instead of recipient
          const paddedRecipient = finalRecipient.slice(2).padStart(64, '0');

          // Use BigInt for amount calculation to avoid precision issues
          const amountFloat = parseFloat(amount);
          const amountInTokenUnits = BigInt(
            Math.floor(amountFloat * Math.pow(10, tokenDecimals))
          );
          const paddedAmount = amountInTokenUnits
            .toString(16)
            .padStart(64, '0');

          // Check if user has enough token balance
          // token.balance is in hex format (wei units), need to convert to decimal
          const tokenBalanceWei = token.balance
            ? BigInt(token.balance)
            : BigInt(0);
          const tokenBalance =
            parseFloat(tokenBalanceWei.toString()) /
            Math.pow(10, tokenDecimals);

          if (tokenBalance < amountFloat) {
            throw new Error(
              `Insufficient ${token.symbol} balance. You have ${tokenBalance.toFixed(6)} ${token.symbol} but trying to send ${amountFloat} ${token.symbol}`
            );
          }

          // Check if user has enough ETH for gas fees
          const nativeToken = nativeTokens.find(
            (t: NativeToken) => t.chain === token.chain
          );
          const ethBalance = nativeToken?.balance
            ? parseFloat(BigInt(nativeToken.balance).toString()) / 1e18
            : 0;

          // Calculate gas cost using the actual gas price we're going to use
          const actualGasCostEth =
            (parseInt(gasEstimate.gasLimit) * gasPriceWei) / 1e18;

          if (ethBalance < actualGasCostEth) {
            throw new Error(
              `Insufficient ${token.chain === 'hyperevm' ? 'HYPE' : 'ETH'} for gas fees. You have ${ethBalance.toFixed(6)} ${token.chain === 'hyperevm' ? 'HYPE' : 'ETH'} but need ${actualGasCostEth.toFixed(6)} ${token.chain === 'hyperevm' ? 'HYPE' : 'ETH'} for gas fees`
            );
          }

          transactionData = {
            type: 'eth_sendTransaction',
            from: activeAccountAddress,
            to: token.contractAddress,
            value: '0x0', // No ETH value for ERC-20 transfers
            data: transferMethodId + paddedRecipient + paddedAmount,
            gas: `0x${parseInt(gasEstimate.gasLimit).toString(16)}`,
            gasPrice: gasPriceHex,
            chainId: getChainId(token.chain),
          };
        }

        // Send transaction through the EVM handler
        const result = await sendMessage('EVM_SEND_TOKEN', {
          transaction: transactionData,
        });

        console.log('✅ Transaction sent successfully:', result);

        // Store transaction hash and navigate to success page
        const txHash = result.data || 'Processing...';
        setTransactionHash(txHash);
        setStep('success');
      } catch (error) {
        console.error('❌ Transaction failed:', error);

        let errorMessage = 'Transaction failed. Please try again.';
        if (error instanceof Error) {
          if (error.message.includes('Failed to resolve')) {
            errorMessage =
              'Failed to resolve HyperLiquid domain name. Please check the address.';
          } else if (error.message.includes('insufficient funds')) {
            errorMessage =
              'Insufficient funds for this transaction including gas fees.';
          } else if (error.message.includes('gas')) {
            errorMessage =
              'Gas estimation failed. The transaction may fail or gas price may have changed.';
          } else if (error.message.includes('nonce')) {
            errorMessage = 'Transaction nonce error. Please try again.';
          } else if (error.message.includes('rejected')) {
            errorMessage = 'Transaction was rejected.';
          } else {
            errorMessage = `Transaction failed: ${error.message}`;
          }
        }

        alert(`❌ ${errorMessage}`);
      } finally {
        setIsEstimatingGas(false);
      }
    }
  };

  const handleBackFromConfirm = () => {
    setStep('send');
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Confirm Transaction"
        onClose={handleBackFromConfirm}
        icon={<ArrowLeft className="size-4 text-white" />}
        rightContent={
          <button
            onClick={closeDialog}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-4 text-white" />
          </button>
        }
      />
      <DialogContent>
        {token && (
          <div className="space-y-6">
            {/* Transaction Summary */}
            <div className="bg-[var(--card-color)] rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CheckCircle className="size-5 mr-2 text-green-500" />
                Transaction Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Token</span>
                  <div className="flex items-center">
                    <div className="flex items-center justify-center size-6 bg-[var(--card-color)] rounded-full mr-2">
                      <TokenLogo
                        symbol={token.symbol}
                        existingLogo={token.logo}
                        className="size-6 rounded-full object-cover p-1"
                        fallbackText={token.symbol.charAt(0).toUpperCase()}
                      />
                    </div>
                    <span className="text-white font-medium">
                      {token.symbol}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount</span>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {amount} {token.symbol}
                    </div>
                    <div className="text-gray-400 text-sm">
                      ≈ $
                      {(
                        (parseFloat(amount) || 0) * (token.usdPrice || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">To</span>
                  <span className="text-white font-mono text-sm">
                    {addressDomain
                      ? addressDomain.slice(0, 6) +
                        '...' +
                        addressDomain.slice(-4)
                      : recipient.slice(0, 6) +
                        '...' +
                        recipient.slice(-4)}{' '}
                    {isHLName && `(${recipient})`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Network</span>
                  <div className="flex items-center">
                    <img
                      src={getNetworkIcon(token.chain)}
                      alt={token.chain}
                      className="size-5 rounded-full mr-2"
                    />
                    <span className="text-white capitalize">{token.chain}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gas Fee Details */}
            {isEstimatingGas ? (
              <div className="bg-[var(--card-color)] rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                  <span className="text-white">Estimating gas fees...</span>
                </div>
              </div>
            ) : gasEstimate ? (
              <div
                className={` rounded-lg p-4 border ${
                  !isHaveEnoughGasFee
                    ? 'border-red-500/20 bg-red-500/10'
                    : 'border-white/10 bg-[var(--card-color)]'
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 flex items-center justify-between ${
                    !isHaveEnoughGasFee ? 'text-red-500' : 'text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <AlertTriangle
                      className={`size-5 mr-2 ${
                        !isHaveEnoughGasFee ? 'text-red-500' : 'text-yellow-500'
                      }`}
                    />
                    Gas Fee Estimation
                  </div>
                  <div className="text-xs text-gray-400 flex items-center">
                    {refreshCountdown > 0
                      ? `Refresh in ${refreshCountdown}s`
                      : 'Auto-refreshing...'}
                    <div
                      className={`ml-1 size-2 rounded-full ${
                        refreshCountdown <= 5
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-green-500 animate-pulse'
                      }`}
                    ></div>
                  </div>
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Gas Limit</span>
                    <span className="text-white">{gasEstimate.gasLimit}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Gas Price</span>
                    <span className="text-white">
                      {gasEstimate.gasPrice} gwei
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-400">Gas Fee</span>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {gasEstimate.gasCostEth}{' '}
                        {token.chain === 'hyperevm' ? 'HYPE' : 'ETH'}
                      </div>
                      <div className="text-gray-400 text-sm">
                        ≈ ${gasEstimate.gasCostUsd}
                      </div>
                    </div>
                  </div>

                  <Collapsible className="flex flex-col justify-between items-center w-full">
                    <CollapsibleTrigger className="w-full py-0">
                      <span className="text-gray-400 text-xs font-medium">
                        Speed
                      </span>
                      <Button className="text-white flex items-center hover:cursor-pointer hover:underline bg-transparent hover:bg-transparent p-0">
                        <p className="text-white text-sm font-medium">
                          {gasPriority}
                        </p>
                        <Pen className="size-3 text-white ml-1" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="w-full">
                      <GasFeeSelection
                        gasEstimate={gasEstimate}
                        setGasEstimate={setGasEstimate}
                        gasPriority={gasPriority}
                        setGasPriority={setGasPriority}
                        token={token}
                        nativeTokens={nativeTokens}
                        amount={amount}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-medium">
                        Total Cost
                      </span>
                      <div className="text-right">
                        <div className="text-white font-semibold text-lg">
                          ${gasEstimate.totalCostUsd}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Token + Gas Fee
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  ⚠️ Failed to estimate gas fees. Please try again.
                </p>
              </div>
            )}

            {!isHaveEnoughGasFee ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm flex items-center text-nowrap">
                  <CircleAlert className="size-4 mr-2" />
                  Don't have enough gas fee. Available:{' '}
                  {parseFloat(
                    nativeTokens.find(
                      (t: NativeToken) => t.chain === token.chain
                    )?.balance || '0'
                  ).toFixed(2)}{' '}
                  {token.chain === 'hyperevm' ? ' HYPE' : ' ETH'}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Please double-check all transaction details. This action
                  cannot be undone.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleBackFromConfirm}
          className="flex-1 bg-gray-600 hover:bg-gray-700"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleConfirmSend}
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={isEstimatingGas || !gasEstimate || !isHaveEnoughGasFee}
          // disabled={isEstimatingGas || !gasEstimate}
        >
          {isEstimatingGas ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              Confirm
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ConfirmSend;
