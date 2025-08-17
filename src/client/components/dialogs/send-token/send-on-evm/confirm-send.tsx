import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DialogContent,
  DialogFooter,
  DialogWrapper,
  IconButton,
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
  AlertTriangle,
  X,
  CircleAlert,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { getNetworkIcon } from '@/utils/network-icons';
import { getAddressByDomain } from '@/client/services/hyperliquid-name-api';
import {
  NativeToken,
  useNativeBalance,
} from '@/client/hooks/use-native-balance';
import TokenLogo from '@/client/components/token-logo';
import { ensureTokenDecimals } from '@/client/utils/token-decimals';
import { Menu } from '@/client/components/ui/menu';

// Constants for better maintainability
const GAS_ESTIMATION_CONSTANTS = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  RETRY_DELAY: 2000, // 2 seconds
  MAX_RETRIES: 3,
  FALLBACK_GAS_PRICE: 20, // gwei
} as const;

const GAS_PRIORITY_MULTIPLIERS = {
  L2: {
    slow: 0.95,
    standard: 1.0,
    fast: 1.05,
    rapid: 1.1,
  },
  L1: {
    slow: 0.8,
    standard: 1.0,
    fast: 1.2,
    rapid: 1.5,
  },
  BUFFER: {
    L2: 1.1,
    L1: 1.2,
  },
} as const;

const GAS_PRIORITY_TIMES = {
  slow: '~30s',
  standard: '~15s',
  fast: '~10s',
  rapid: '~5s',
} as const;

const SKELETON_CONSTANTS = {
  ANIMATION: 'animate-pulse',
  COLORS: {
    BACKGROUND: 'bg-gray-300 dark:bg-gray-600',
    SHIMMER: 'bg-white/10',
  },
  SIZES: {
    GAS_LIMIT: 'h-4 w-16',
    GAS_PRICE: 'h-4 w-20',
    GAS_FEE: 'h-4 w-24',
    GAS_USD: 'h-4 w-16',
    SPEED: 'h-4 w-18',
  },
} as const;

type GasEstimate = {
  gasLimit: string;
  gasPrice: string;
  gasCostEth: string;
  gasCostUsd: string;
  totalCostUsd: string;
};

// Gas estimation skeleton component with consistent header
const GasEstimationSkeleton = () => {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="text-white text-base">Gas Estimate</h4>
        </div>
        <IconButton>
          <RefreshCw className="size-4 text-white animate-spin" />
        </IconButton>
      </div>

      {/* Gas details skeleton using Menu structure */}
      <Menu
        items={[
          {
            label: 'Gas Limit',
            description: '',
            arrowLeftIcon: () => (
              <div
                className={`${SKELETON_CONSTANTS.SIZES.GAS_LIMIT} ${SKELETON_CONSTANTS.COLORS.SHIMMER} rounded ${SKELETON_CONSTANTS.ANIMATION}`}
              ></div>
            ),
          },
          {
            label: 'Gas Price',
            description: '',
            arrowLeftIcon: () => (
              <div
                className={`${SKELETON_CONSTANTS.SIZES.GAS_PRICE} ${SKELETON_CONSTANTS.COLORS.SHIMMER} rounded ${SKELETON_CONSTANTS.ANIMATION}`}
              ></div>
            ),
          },
          {
            label: 'Gas Fee',
            description: '',
            arrowLeftIcon: () => (
              <div
                className={`${SKELETON_CONSTANTS.SIZES.GAS_FEE} ${SKELETON_CONSTANTS.COLORS.SHIMMER} rounded ${SKELETON_CONSTANTS.ANIMATION}`}
              ></div>
            ),
          },
          {
            label: 'Gas Fee (USD)',
            description: '',
            arrowLeftIcon: () => (
              <div
                className={`${SKELETON_CONSTANTS.SIZES.GAS_USD} ${SKELETON_CONSTANTS.COLORS.SHIMMER} rounded ${SKELETON_CONSTANTS.ANIMATION}`}
              ></div>
            ),
          },
          {
            label: 'Speed',
            description: '',
            arrowLeftIcon: () => (
              <div className="flex items-center space-x-2">
                <div
                  className={`${SKELETON_CONSTANTS.SIZES.SPEED} ${SKELETON_CONSTANTS.COLORS.SHIMMER} rounded ${SKELETON_CONSTANTS.ANIMATION}`}
                ></div>
                <div
                  className={`w-5 h-5 ${SKELETON_CONSTANTS.COLORS.SHIMMER} rounded ${SKELETON_CONSTANTS.ANIMATION}`}
                ></div>
              </div>
            ),
          },
        ]}
      />

      {/* Total cost skeleton */}
      <Menu
        items={[
          {
            label: 'Total (Token + Gas Fee)',
            description: '',
            arrowLeftIcon: () => (
              <div
                className={`h-4 w-20 ${SKELETON_CONSTANTS.COLORS.SHIMMER} rounded ${SKELETON_CONSTANTS.ANIMATION}`}
              ></div>
            ),
          },
        ]}
      />
    </div>
  );
};

// Compact error component that fits with Menu design
const GasEstimationError = ({
  error,
  onRetry,
  retryCount = 0,
  isRetrying = false,
}: {
  error: string;
  onRetry: () => void;
  retryCount?: number;
  isRetrying?: boolean;
}) => {
  const canRetry = retryCount < GAS_ESTIMATION_CONSTANTS.MAX_RETRIES;
  const shortError = error.length > 50 ? error.substring(0, 50) + '...' : error;

  return (
    <div className="space-y-3">
      {/* Error header with retry action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="text-white text-base">Gas Estimate</h4>
          <div className="flex items-center space-x-1">
            <AlertTriangle className="size-3 text-yellow-400" />
            <span className="text-yellow-400 text-xs">failed</span>
          </div>
        </div>
        {canRetry && (
          <IconButton onClick={onRetry} disabled={isRetrying}>
            <RefreshCw
              className={`size-4 text-gray-400 ${isRetrying ? 'animate-spin' : ''}`}
            />
          </IconButton>
        )}
      </div>

      {/* Error details in Menu format */}
      <Menu
        items={[
          {
            label: 'Status',
            description: canRetry ? 'Retrying...' : 'Failed',
            arrowLeftIcon: () => (
              <div
                className={`w-2 h-2 rounded-full ${canRetry ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`}
              />
            ),
          },
          {
            label: 'Error',
            description: shortError,
          },
          ...(retryCount > 0
            ? [
                {
                  label: 'Attempts',
                  description: `${retryCount}/${GAS_ESTIMATION_CONSTANTS.MAX_RETRIES}`,
                },
              ]
            : []),
        ]}
      />

      {/* Manual retry for max attempts reached */}
      {!canRetry && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="size-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 text-xs font-medium mb-1">
                Unable to estimate gas fees
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Please check your connection and try refreshing the page
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
      const tokenDecimals = await ensureTokenDecimals(token);

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

    // Get gas estimate and gas price in parallel
    const [gasEstimateResponse, gasPriceResponse] = await Promise.all([
      sendMessage('EVM_ESTIMATE_GAS', {
        txObject: txObject,
        chainId: getChainId(token.chain),
      }),
      sendMessage('EVM_GET_GAS_PRICE', {
        chainId: getChainId(token.chain),
      }),
    ]);

    // Check if the gas estimate response is successful and has data
    if (!gasEstimateResponse?.success || !gasEstimateResponse?.data) {
      throw new Error('Failed to get gas estimate from backend');
    }

    const estimateData = gasEstimateResponse.data;

    // Check if gasEstimate exists in the response
    if (!estimateData.gasEstimate) {
      throw new Error('Gas estimate not found in response');
    }

    const gasLimit = parseInt(estimateData.gasEstimate, 16);

    // Handle gas price - throw error if not available instead of using fallback
    if (!gasPriceResponse?.success || !gasPriceResponse?.data?.gasPrice) {
      throw new Error(
        'Unable to fetch current gas price. Please try again later.'
      );
    }

    const effectiveGasPrice = parseInt(gasPriceResponse.data.gasPrice, 16);
    const gasPriceGwei = effectiveGasPrice / 1e9;

    // Calculate gas cost in ETH
    const gasCostWei = gasLimit * effectiveGasPrice;
    const gasCostEth = gasCostWei / 1e18;

    const nativeToken = nativeTokens.find(
      (t: NativeToken) => t.chain === token.chain
    );

    if (!nativeToken?.usdPrice) {
      throw new Error(
        'Unable to fetch current token price for gas calculation. Please try again later.'
      );
    }

    const nativeTokenPrice = nativeToken.usdPrice;

    const gasCostUsd = gasCostEth * nativeTokenPrice;
    const tokenTotalCostUsd = parseFloat(amount) * (token.usdPrice || 0);
    const totalCostUsd = tokenTotalCostUsd + gasCostUsd;

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
    // Re-throw the error instead of providing fallback values
    throw error;
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
      time: GAS_PRIORITY_TIMES.slow,
      gasCostEth: '',
      gasCostUsd: '',
      totalCostUsd: '',
    },
    standard: {
      gasPrice: '',
      time: GAS_PRIORITY_TIMES.standard,
      gasCostEth: '',
      gasCostUsd: '',
      totalCostUsd: '',
    },
    fast: {
      gasPrice: '',
      time: GAS_PRIORITY_TIMES.fast,
      gasCostEth: '',
      gasCostUsd: '',
      totalCostUsd: '',
    },
    rapid: {
      gasPrice: '',
      time: GAS_PRIORITY_TIMES.rapid,
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
      ? GAS_PRIORITY_MULTIPLIERS.L2
      : GAS_PRIORITY_MULTIPLIERS.L1;

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
  const [gasEstimationError, setGasEstimationError] = useState<string | null>(
    null
  );
  const [gasRetryCount, setGasRetryCount] = useState(0);
  const [isRetryingGas, setIsRetryingGas] = useState(false);
  const [addressDomain, setAddressDomain] = useState<string | null>(null);
  const { nativeTokens } = useNativeBalance();
  const [isHaveEnoughGasFee, setIsHaveEnoughGasFee] = useState(true);
  const [gasPriority, setGasPriority] = useState<GasPriority>('standard');
  const [gasRefreshCounter, setGasRefreshCounter] = useState(0);
  const [lastGasUpdate, setLastGasUpdate] = useState<number>(Date.now());
  const [refreshCountdown, setRefreshCountdown] = useState<number>(30);
  const [isGasCollapsibleOpen, setIsGasCollapsibleOpen] = useState(false);

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

  // Gas estimation function with retry logic
  const performGasEstimation = async (isRetry = false) => {
    if (!token || !amount || !recipient || !activeAccountAddress) return;

    if (isHLName && !addressDomain) {
      setIsEstimatingGas(false);
      return;
    }

    setIsEstimatingGas(true);
    if (isRetry) {
      setIsRetryingGas(true);
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
      setGasEstimationError(null);
      setGasRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      setGasEstimate(null);
      const errorMessage =
        error instanceof Error ? error.message : 'Unable to estimate gas fees';
      setGasEstimationError(errorMessage);

      // Auto-retry logic for retryable errors
      if (!isRetry && gasRetryCount < GAS_ESTIMATION_CONSTANTS.MAX_RETRIES) {
        const isRetryableError =
          errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Unable to fetch');

        if (isRetryableError) {
          setGasRetryCount(prev => prev + 1);
          setTimeout(() => {
            performGasEstimation(true);
          }, GAS_ESTIMATION_CONSTANTS.RETRY_DELAY);
        }
      }
    } finally {
      setIsEstimatingGas(false);
      setIsRetryingGas(false);
    }
  };

  // Manual retry handler
  const handleGasRetry = () => {
    setGasRetryCount(prev => prev + 1);
    performGasEstimation(true);
  };

  useEffect(() => {
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

    const refreshInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastGasUpdate;

      // Only refresh if enough time has passed and we're not currently estimating
      if (
        timeSinceLastUpdate >= GAS_ESTIMATION_CONSTANTS.REFRESH_INTERVAL &&
        !isEstimatingGas
      ) {
        setGasRefreshCounter(prev => prev + 1);
        setLastGasUpdate(Date.now());
      }
    }, GAS_ESTIMATION_CONSTANTS.REFRESH_INTERVAL);

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
          console.warn(
            `⚠️ Invalid gas price, using fallback of ${GAS_ESTIMATION_CONSTANTS.FALLBACK_GAS_PRICE} gwei`
          );
          gasPriceGwei = GAS_ESTIMATION_CONSTANTS.FALLBACK_GAS_PRICE;
        }

        // Add safety buffer to gas price (10% extra) to account for network changes
        const isL2 =
          token.chain === 'arbitrum' ||
          token.chain === 'base' ||
          token.chain === 'hyperevm';
        const bufferMultiplier = isL2
          ? GAS_PRIORITY_MULTIPLIERS.BUFFER.L2
          : GAS_PRIORITY_MULTIPLIERS.BUFFER.L1;
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
          const tokenDecimals = await ensureTokenDecimals(token);

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
        title="Confirm Send"
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
          <div className="space-y-4">
            {/* Token Display */}
            <div className="flex items-center justify-center size-24 bg-[var(--card-color)] rounded-full relative mx-auto">
              <TokenLogo
                symbol={token.symbol}
                networkId={token.chain}
                existingLogo={token.logo}
                tokenAddress={token.contractAddress}
                className="size-24 rounded-full object-cover"
                fallbackText={token.symbol.charAt(0).toUpperCase()}
              />
              {token.chain && (
                <div className="absolute bottom-0 right-0 flex items-center justify-center bg-[var(--card-color)] rounded-full">
                  <img
                    src={getNetworkIcon(token.chain)}
                    alt={token.chain}
                    className="size-6 rounded-full"
                  />
                </div>
              )}
            </div>

            {/* Transaction Summary */}
            <Menu
              items={[
                {
                  label: 'Token',
                  description: token.symbol,
                },
                {
                  label: 'Amount',
                  description: `${amount} ${token.symbol}`,
                },
                {
                  label: 'USD Value',
                  description: `≈ $${(
                    (parseFloat(amount) || 0) * (token.usdPrice || 0)
                  ).toFixed(2)}`,
                },
                {
                  label: 'To',
                  description: isHLName
                    ? `${addressDomain} (${recipient})`
                    : recipient,
                  isLongDescription: true,
                },
                {
                  label: 'Network',
                  description:
                    token.chain === 'hyperevm'
                      ? 'HypeEVM'
                      : token.chain.charAt(0).toUpperCase() +
                        token.chain.slice(1),
                },
              ]}
            />

            {/* Gas Fee Details */}
            {isEstimatingGas ? (
              <GasEstimationSkeleton />
            ) : gasEstimationError ? (
              <GasEstimationError
                error={gasEstimationError}
                onRetry={handleGasRetry}
                retryCount={gasRetryCount}
                isRetrying={isRetryingGas}
              />
            ) : gasEstimate ? (
              <>
                <div>
                  {/* Gas estimate header with refresh */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-white text-base">Gas Estimate</h4>
                      {refreshCountdown > 0 ? (
                        <div className="flex items-center space-x-1">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              refreshCountdown > 20
                                ? 'bg-green-400'
                                : refreshCountdown > 10
                                  ? 'bg-yellow-400'
                                  : 'bg-orange-400'
                            }`}
                          ></div>
                          <span className="text-gray-400 text-xs">
                            {refreshCountdown}s
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                          <span className="text-blue-400 text-xs">
                            updating...
                          </span>
                        </div>
                      )}
                    </div>
                    <IconButton
                      onClick={() => setGasRefreshCounter(prev => prev + 1)}
                      disabled={isEstimatingGas}
                    >
                      <RefreshCw className="size-4 text-gray-400" />
                    </IconButton>
                  </div>
                  <Menu
                    items={[
                      {
                        label: 'Gas Limit',
                        description: gasEstimate.gasLimit,
                      },
                      {
                        label: 'Gas Price',
                        description: `${gasEstimate.gasPrice} gwei`,
                      },
                      {
                        label: 'Gas Fee',
                        description: `${gasEstimate.gasCostEth} ${token.chain === 'hyperevm' ? 'HYPE' : 'ETH'}`,
                      },
                      {
                        label: 'Gas Fee (USD)',
                        description: `≈ $${gasEstimate.gasCostUsd}`,
                      },
                      {
                        label: 'Speed',
                        description:
                          gasPriority.charAt(0).toUpperCase() +
                          gasPriority.slice(1),
                        arrowLeftIcon: () => (
                          <ChevronDown
                            className={`size-5 transition-transform duration-200 ${
                              isGasCollapsibleOpen ? 'rotate-180' : ''
                            }`}
                          />
                        ),
                        onClick: () => {
                          // Toggle collapsible and update state
                          setIsGasCollapsibleOpen(!isGasCollapsibleOpen);
                          const trigger = document.querySelector(
                            '[data-state]'
                          ) as HTMLElement;
                          if (trigger) trigger.click();
                        },
                      },
                    ]}
                  />
                  <Collapsible
                    open={isGasCollapsibleOpen}
                    onOpenChange={setIsGasCollapsibleOpen}
                  >
                    <CollapsibleTrigger
                      className="hidden"
                      data-state={isGasCollapsibleOpen ? 'open' : 'closed'}
                    >
                      <span></span>
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
                </div>

                <Menu
                  items={[
                    {
                      label: 'Total (Token + Gas Fee)',
                      description: `$${gasEstimate.totalCostUsd}`,
                    },
                  ]}
                />
              </>
            ) : (
              <GasEstimationError
                error="Failed to estimate gas fees. Please check your network connection and try again."
                onRetry={handleGasRetry}
                retryCount={gasRetryCount}
                isRetrying={isRetryingGas}
              />
            )}
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleConfirmSend}
          disabled={
            isEstimatingGas ||
            !gasEstimate ||
            !isHaveEnoughGasFee ||
            !!gasEstimationError
          }
          variant="primary"
          className="w-full"
        >
          {isEstimatingGas ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Updating...
            </>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              Send
            </>
          )}
          {!isHaveEnoughGasFee && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm flex items-center text-nowrap">
                <CircleAlert className="size-4 mr-2" />
                Don't have enough gas fee.
              </p>
            </div>
          )}
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ConfirmSend;
