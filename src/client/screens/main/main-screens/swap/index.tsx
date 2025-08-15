import { useState, useEffect } from 'react';
import { Button, Input } from '@/client/components/ui';
import { ArrowUpDown, ChevronDown, AlertTriangle, Zap } from 'lucide-react';
import useSwapStore from '@/client/hooks/use-swap-store';
import useSwapRoute from '@/client/hooks/use-swap-route';
import { SwapTokenSelectorDrawer } from '@/client/components/drawers';
import useDrawerStore from '@/client/hooks/use-drawer-store';
import useSwapTimerStore from '@/client/hooks/use-swap-timer-store';
// Create a comprehensive formatBalance function for display
const formatBalance = (balance: number): string => {
  if (balance === 0) return '0';

  // For very small amounts, show more precision
  if (balance < 0.000001) {
    if (balance < 0.000000001) return '<0.000000001';
    return balance.toExponential(2);
  }

  // For small amounts, show 6 decimal places
  if (balance < 1) return balance.toFixed(6);

  // For medium amounts, show 4 decimal places
  if (balance < 1000) return balance.toFixed(4);

  // For large amounts, use K/M notation
  if (balance < 1000000) return (balance / 1000).toFixed(2) + 'K';
  return (balance / 1000000).toFixed(2) + 'M';
};

// Format price change percentage
const formatPriceChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

import { sendMessage } from '@/client/utils/extension-message-utils';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { SwapSuccess } from '@/client/components/dialogs';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { fetchBalances } from '@/client/services/liquidswap-api';
import {
  fetchTokenPrices,
  Network,
} from '@/client/services/gecko-terminal-api';

// Default WHYPE token data
const DEFAULT_WHYPE_TOKEN = {
  address: '0x5555555555555555555555555555555555555555',
  name: 'Wrapped HYPE',
  symbol: 'WHYPE',
  decimals: 18,
  isERC20Verified: true,
  totalTransfers: 1280900,
  transfers24h: 61195,
  logo: 'https://coin-images.coingecko.com/coins/images/54469/large/_UP3jBsi_400x400.jpg?1739905920',
};

// HYPE native token identifiers
const HYPE_NATIVE_IDENTIFIERS = ['HYPE', 'native', 'NATIVE'];
const WHYPE_TOKEN_ADDRESS = '0x5555555555555555555555555555555555555555';
const HYPE_DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

const Swap = () => {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    isExactIn,
    slippage,
    route,
    isLoadingRoute,
    routeError,
    isSwapping,
    setAmountIn,
    setAmountOut,
    setIsExactIn,
    setIsSwapping,
    setTokenOut,
    setTokenIn,
    switchTokens,
  } = useSwapStore();

  const { getActiveAccountWalletObject } = useWalletStore();
  const { openDrawer } = useDrawerStore();
  const { openDialog } = useDialogStore();
  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Initialize swap route hook
  const { refetchRoute } = useSwapRoute();

  const [swapError, setSwapError] = useState<string | null>(null);

  // Token price state
  const [tokenPrices, setTokenPrices] = useState<{
    [address: string]: {
      price: number;
      priceChange24h: number;
    };
  }>({});

  // Timer state for route refetching
  const { startTimer, resetTimer, cleanup } = useSwapTimerStore();

  // Auto-set WHYPE as default output token if no token is selected
  useEffect(() => {
    if (!tokenOut) {
      const whypeUnifiedToken = {
        contractAddress: DEFAULT_WHYPE_TOKEN.address,
        symbol: DEFAULT_WHYPE_TOKEN.symbol,
        name: DEFAULT_WHYPE_TOKEN.name,
        decimals: DEFAULT_WHYPE_TOKEN.decimals,
        balance: '0',
        chain: 'hyperevm' as const,
        chainName: 'HyperEVM',
        logo: DEFAULT_WHYPE_TOKEN.logo,
        balanceFormatted: 0,
        usdValue: 0,
      };

      setTokenOut(whypeUnifiedToken);
    }
  }, [tokenOut, setTokenOut]);

  // Get token balances with proper decimal handling
  const getTokenBalance = (token: any): number => {
    if (!token?.balance) return 0;
    try {
      // Handle both hex string and regular string balances
      let balanceValue;
      if (typeof token.balance === 'string' && token.balance.startsWith('0x')) {
        balanceValue = BigInt(token.balance);
      } else {
        balanceValue = BigInt(token.balance || '0');
      }

      const decimals = token.decimals || 18;
      const divisor = BigInt(10) ** BigInt(decimals);

      // Convert to number with proper precision
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

  const tokenInBalance = tokenIn ? getTokenBalance(tokenIn) : 0;
  const tokenOutBalance = tokenOut ? getTokenBalance(tokenOut) : 0;

  // Helper functions to detect HYPE/WHYPE scenarios
  const isHypeToken = (token: any): boolean => {
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

  const isWhypeToken = (token: any): boolean => {
    if (!token) return false;
    return (
      token.symbol === 'WHYPE' ||
      token.contractAddress?.toLowerCase() === WHYPE_TOKEN_ADDRESS.toLowerCase()
    );
  };

  const isWrapScenario = (): boolean => {
    return isHypeToken(tokenIn) && isWhypeToken(tokenOut);
  };

  const isUnwrapScenario = (): boolean => {
    return isWhypeToken(tokenIn) && isHypeToken(tokenOut);
  };

  const getActionButtonText = (): string => {
    if (isWrapScenario()) {
      return 'Wrap';
    } else if (isUnwrapScenario()) {
      return 'Unwrap';
    } else {
      return 'Swap';
    }
  };

  useEffect(() => {
    const fetchWHYPEBalance = async () => {
      if (!activeAccountAddress) return;
      if (
        tokenOut?.contractAddress !== WHYPE_TOKEN_ADDRESS &&
        tokenIn?.contractAddress !== WHYPE_TOKEN_ADDRESS
      ) {
        return;
      }

      try {
        console.log('🔄 Fetching WHYPE balance for:', activeAccountAddress);

        const balance = await fetchBalances({
          wallet: activeAccountAddress || '',
          limit: 1000,
        });

        console.log('📊 Full balance response:', balance);

        // Check if balance response has the expected structure
        if (!balance?.data?.tokens || !Array.isArray(balance.data.tokens)) {
          console.log('❌ Invalid balance response structure');
          return;
        }

        const whypeBalance = balance.data.tokens.find(
          (token: any) => token.token === WHYPE_TOKEN_ADDRESS
        );

        console.log('🔍 WHYPE balance found:', whypeBalance);

        if (whypeBalance && whypeBalance.balance !== undefined) {
          // Create a temporary token object to use getTokenBalance function
          const tempToken = {
            balance: whypeBalance.balance,
            decimals: 18, // WHYPE has 18 decimals
          };
          const formattedBalance = getTokenBalance(tempToken);

          console.log('💰 Formatted WHYPE balance:', formattedBalance);

          if (tokenOut?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            console.log('🔄 Updating tokenOut with WHYPE balance');
            setTokenOut({
              ...tokenOut,
              balance: whypeBalance.balance,
              balanceFormatted: formattedBalance,
              usdValue: formattedBalance * (tokenOut?.usdPrice || 0),
            });
          } else if (tokenIn?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            console.log('🔄 Updating tokenIn with WHYPE balance');
            setTokenIn({
              ...tokenIn,
              balance: whypeBalance.balance,
              balanceFormatted: formattedBalance,
              usdValue: formattedBalance * (tokenIn?.usdPrice || 0),
            });
          }
        } else {
          console.log('❌ No WHYPE balance found in response');

          // Set default balance of 0 for WHYPE tokens if not found
          if (tokenOut?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            console.log('🔄 Setting default WHYPE balance for tokenOut');
            setTokenOut({
              ...tokenOut,
              balance: '0',
              balanceFormatted: 0,
              usdValue: 0,
            });
          } else if (tokenIn?.contractAddress === WHYPE_TOKEN_ADDRESS) {
            console.log('🔄 Setting default WHYPE balance for tokenIn');
            setTokenIn({
              ...tokenIn,
              balance: '0',
              balanceFormatted: 0,
              usdValue: 0,
            });
          }
        }
      } catch (error) {
        console.error('❌ Error fetching WHYPE balance:', error);
      }
    };

    // Only fetch if we have an active account and either token is WHYPE
    if (
      activeAccountAddress &&
      (tokenOut?.contractAddress === WHYPE_TOKEN_ADDRESS ||
        tokenIn?.contractAddress === WHYPE_TOKEN_ADDRESS)
    ) {
      fetchWHYPEBalance();
    }
  }, [
    activeAccountAddress,
    tokenOut?.contractAddress,
    tokenIn?.contractAddress,
  ]);

  // Start timer when both tokens are selected and there's an amount, but only after initial route is loaded
  // Skip timer for wrap/unwrap scenarios
  useEffect(() => {
    const isWrapUnwrapScenario = isWrapScenario() || isUnwrapScenario();

    if (
      tokenIn &&
      tokenOut &&
      (amountIn || amountOut) &&
      !isLoadingRoute &&
      route &&
      !isWrapUnwrapScenario // Don't start timer for wrap/unwrap
    ) {
      // Only start timer if we have a successful route (not immediately after token/amount changes)
      startTimer(refetchRoute);
    } else {
      resetTimer();
    }

    return cleanup;
  }, [
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    isLoadingRoute,
    route,
    startTimer,
    resetTimer,
    cleanup,
    refetchRoute,
  ]);

  // Fetch token prices when tokens are selected
  useEffect(() => {
    const fetchPrices = async () => {
      const addresses: string[] = [];

      // Add token addresses to fetch prices for
      if (tokenIn?.contractAddress) {
        let tokenInAddress = tokenIn.contractAddress;

        if (tokenIn.contractAddress.toLowerCase() === 'native') {
          tokenInAddress = WHYPE_TOKEN_ADDRESS;
        }
        addresses.push(tokenInAddress);
      }
      if (tokenOut?.contractAddress) {
        let tokenOutAddress = tokenOut.contractAddress;

        if (tokenOut.contractAddress.toLowerCase() === 'native') {
          tokenOutAddress = WHYPE_TOKEN_ADDRESS;
        }
        addresses.push(tokenOutAddress);
      }

      if (addresses.length === 0) return;

      try {
        console.log('🔄 Fetching token prices for:', addresses);

        // Determine network based on token chain
        const network: Network =
          tokenIn?.chain === 'hyperevm' || tokenOut?.chain === 'hyperevm'
            ? 'hyperevm'
            : 'eth'; // Default to eth for other chains

        const response = await fetchTokenPrices(network, addresses);

        console.log('📊 Token prices response:', response);

        if (response?.data?.attributes) {
          const prices = response.data.attributes.token_prices || {};
          const priceChanges =
            response.data.attributes.h24_price_change_percentage || {};

          const newTokenPrices: {
            [address: string]: { price: number; priceChange24h: number };
          } = {};

          addresses.forEach(address => {
            console.log('🔍 Address:', address);
            const price = prices[address.toLowerCase()];
            const priceChange = priceChanges[address.toLowerCase()];
            console.log('🔍 Price:', price);
            console.log('🔍 Price Change:', priceChange);

            if (price !== undefined) {
              newTokenPrices[address] = {
                price: parseFloat(price),
                priceChange24h: priceChange ? parseFloat(priceChange) : 0,
              };
            }

            const isHaveNativeToken =
              tokenIn?.contractAddress?.toLowerCase() === 'native' ||
              tokenOut?.contractAddress?.toLowerCase() === 'native';

            if (isHaveNativeToken && newTokenPrices['native'] === undefined) {
              newTokenPrices['native'] = {
                price: parseFloat(price),
                priceChange24h: priceChange ? parseFloat(priceChange) : 0,
              };
            }
          });

          setTokenPrices(newTokenPrices);
          console.log('💰 Updated token prices:', newTokenPrices);

          // Update token objects with prices
          if (tokenIn?.contractAddress) {
            const tokenInAddress =
              tokenIn.contractAddress.toLowerCase() === 'native'
                ? WHYPE_TOKEN_ADDRESS
                : tokenIn.contractAddress;

            if (newTokenPrices[tokenInAddress]) {
              setTokenIn({
                ...tokenIn,
                usdPrice: newTokenPrices[tokenInAddress].price,
              });
            }
          }

          if (tokenOut?.contractAddress) {
            const tokenOutAddress =
              tokenOut.contractAddress.toLowerCase() === 'native'
                ? WHYPE_TOKEN_ADDRESS
                : tokenOut.contractAddress;

            if (newTokenPrices[tokenOutAddress]) {
              setTokenOut({
                ...tokenOut,
                usdPrice: newTokenPrices[tokenOutAddress].price,
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching token prices:', error);
      }
    };

    fetchPrices();
  }, [
    tokenIn?.contractAddress,
    tokenOut?.contractAddress,
    tokenIn?.chain,
    tokenOut?.chain,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Validation
  const inputAmount = parseFloat(amountIn || '0');
  const hasInsufficientBalance = inputAmount > tokenInBalance;
  const isValidSwap =
    tokenIn &&
    tokenOut &&
    amountIn &&
    amountOut &&
    !hasInsufficientBalance &&
    !routeError &&
    route;

  // Handle input changes with decimal validation
  const handleAmountInChange = (value: string) => {
    // Allow empty input
    if (value === '') {
      setAmountIn('');
      setIsExactIn(true);
      return;
    }

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenIn && value.includes('.')) {
      const maxDecimals = Math.min(tokenIn.decimals || 18, 8);
      const [, decimal] = value.split('.');
      if (decimal && decimal.length > maxDecimals) return;
    }

    setAmountIn(value);
    setIsExactIn(true);
  };

  const handleAmountOutChange = (value: string) => {
    // Allow empty input
    if (value === '') {
      setAmountOut('');
      setIsExactIn(false);
      return;
    }

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenOut && value.includes('.')) {
      const maxDecimals = Math.min(tokenOut.decimals || 18, 8);
      const [, decimal] = value.split('.');
      if (decimal && decimal.length > maxDecimals) return;
    }

    setAmountOut(value);
    setIsExactIn(false);
  };

  const handleMaxClick = () => {
    if (tokenIn && tokenInBalance > 0) {
      // Format max amount with appropriate precision
      const decimals = tokenIn.decimals || 18;
      const maxDecimals = Math.min(decimals, 8); // Limit display decimals
      const maxAmount = tokenInBalance
        .toFixed(maxDecimals)
        .replace(/\.?0+$/, '');
      setAmountIn(maxAmount);
      setIsExactIn(true);
    }
  };

  const handleHalfClick = () => {
    if (tokenIn && tokenInBalance > 0) {
      const decimals = tokenIn.decimals || 18;
      const maxDecimals = Math.min(decimals, 8);
      const halfAmount = (tokenInBalance / 2)
        .toFixed(maxDecimals)
        .replace(/\.?0+$/, '');
      setAmountIn(halfAmount);
      setIsExactIn(true);
    }
  };

  // Handle swap execution with automatic approval
  const handleSwap = async () => {
    if (!isValidSwap || !activeAccountAddress || !route) return;

    setIsSwapping(true);
    setSwapError(null);

    try {
      const actionType = isWrapScenario()
        ? 'wrap'
        : isUnwrapScenario()
          ? 'unwrap'
          : 'swap';
      console.log(`🔄 Starting ${actionType} with automatic approval...`, {
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn,
        amountOut,
        route: route.execution,
        actionType,
      });

      if (!route.execution) {
        throw new Error('No execution data in route');
      }

      // Check if this is a direct wrap/unwrap scenario
      const isDirectWrapUnwrapScenario = isWrapScenario() || isUnwrapScenario();

      // Determine if we're swapping from native token
      const isFromNativeToken = isHypeToken(tokenIn);

      // Step 1: Handle approval for ERC20 tokens (skip for direct wrap/unwrap)
      if (!isFromNativeToken && !isDirectWrapUnwrapScenario) {
        console.log('🔍 Checking and handling token approval...');

        const spenderAddress = route.execution.to;
        if (!spenderAddress) {
          throw new Error('No spender address found in route');
        }

        // Check current allowance
        const allowanceData = {
          tokenAddress: tokenIn.contractAddress,
          ownerAddress: activeAccountAddress,
          spenderAddress: spenderAddress,
          chainId: '0x3e7', // HyperEVM
        };

        console.log('🔍 Checking token allowance:', allowanceData);
        const allowanceResult = await sendMessage(
          'EVM_CHECK_TOKEN_ALLOWANCE',
          allowanceData
        );

        if (!allowanceResult.success) {
          throw new Error(allowanceResult.error || 'Failed to check allowance');
        }

        const allowance = allowanceResult.data.allowance;

        // Convert current amount to wei for comparison
        const amountInFloat = parseFloat(amountIn);
        const decimals = tokenIn.decimals || 18;
        const amountInWei = BigInt(
          Math.floor(amountInFloat * Math.pow(10, decimals))
        );
        const allowanceWei = BigInt(allowance);

        const needsApproval = allowanceWei < amountInWei;

        console.log('✅ Allowance check result:', {
          allowance,
          amountInWei: amountInWei.toString(),
          needsApproval,
        });

        // Step 2: Approve if needed
        if (needsApproval) {
          console.log('📝 Approving token for swap...');

          // Use a large approval amount (max uint256 is common practice)
          const maxApproval =
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

          const approvalData = {
            tokenAddress: tokenIn.contractAddress,
            spenderAddress: spenderAddress,
            amount: maxApproval,
            chainId: '0x3e7', // HyperEVM
          };

          const approvalResult = await sendMessage(
            'EVM_APPROVE_TOKEN',
            approvalData
          );

          if (!approvalResult.success) {
            throw new Error(approvalResult.error || 'Token approval failed');
          }

          console.log('✅ Token approved successfully:', approvalResult.data);
        }
      }

      // Step 3: Execute the transaction
      console.log('🔄 Executing transaction...');

      let transactionData;
      let result;

      if (isDirectWrapUnwrapScenario) {
        // Handle direct wrap/unwrap
        console.log('🔄 Executing direct wrap/unwrap...');

        if (isWrapScenario()) {
          // HYPE -> WHYPE: Call wrap function on WHYPE contract
          const amountInFloat = parseFloat(amountIn);
          const decimals = tokenIn.decimals || 18;
          const amountInWei = BigInt(
            Math.floor(amountInFloat * Math.pow(10, decimals))
          );

          transactionData = {
            to: WHYPE_TOKEN_ADDRESS,
            data: '0xd0e30db0', // deposit() function selector for WETH-like contracts
            value: `0x${amountInWei.toString(16)}`,
          };
        } else {
          // WHYPE -> HYPE: Call unwrap function on WHYPE contract
          const amountInFloat = parseFloat(amountIn);
          const decimals = tokenIn.decimals || 18;
          const amountInWei = BigInt(
            Math.floor(amountInFloat * Math.pow(10, decimals))
          );

          // For unwrapping, we need to call withdraw(amount) on WHYPE contract
          // withdraw(uint256) has selector 0x2e1a7d4d
          const withdrawSelector = '0x2e1a7d4d';
          const amountHex = amountInWei.toString(16).padStart(64, '0');

          transactionData = {
            to: WHYPE_TOKEN_ADDRESS,
            data: withdrawSelector + amountHex,
            value: '0x0',
          };
        }

        console.log('📝 Direct wrap/unwrap transaction data:', transactionData);

        // Send transaction via background script
        result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', {
          transaction: transactionData,
        });
      } else {
        // Handle regular swap
        let transactionValue = '0';

        if (isFromNativeToken) {
          // Convert human-readable amount to wei for native token transfer
          const amountInFloat = parseFloat(amountIn);
          const decimals = tokenIn.decimals || 18;
          const amountInWei = BigInt(
            Math.floor(amountInFloat * Math.pow(10, decimals))
          );
          transactionValue = `0x${amountInWei.toString(16)}`;

          console.log('💰 Native token swap detected:', {
            symbol: tokenIn.symbol,
            amountIn,
            amountInWei: amountInWei.toString(),
            transactionValue,
          });
        }

        // Prepare transaction data
        transactionData = {
          to: route.execution.to,
          data: route.execution.calldata,
          value: transactionValue,
        };

        console.log('📝 Swap transaction data:', transactionData);

        // Send transaction via background script
        result = await sendMessage('EVM_SWAP_HYPERLIQUID_TOKEN', {
          transaction: transactionData,
        });
      }

      if (result.success) {
        const actionType = isWrapScenario()
          ? 'Wrap'
          : isUnwrapScenario()
            ? 'Unwrap'
            : 'Swap';
        console.log(`✅ ${actionType} successful:`, result.data);

        // Show success dialog
        openDialog(
          <SwapSuccess
            transactionHash={result.data}
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            amountIn={amountIn}
            amountOut={amountOut}
            chainId={result.data.chainId || '0x3e7'}
          />
        );
      } else {
        const actionType = isWrapScenario()
          ? 'Wrap'
          : isUnwrapScenario()
            ? 'Unwrap'
            : 'Swap';
        throw new Error(result.error || `${actionType} failed`);
      }
    } catch (error) {
      const actionType = isWrapScenario()
        ? 'Wrap'
        : isUnwrapScenario()
          ? 'Unwrap'
          : 'Swap';
      console.error(`❌ ${actionType} error:`, error);
      const errorMessage =
        error instanceof Error ? error.message : `${actionType} failed`;
      setSwapError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  // Token selection handlers
  const handleTokenInSelect = () => {
    openDrawer(
      <SwapTokenSelectorDrawer
        mode="input"
        selectedTokenAddress={tokenIn?.contractAddress}
        excludeTokenAddress={tokenOut?.contractAddress}
      />
    );
  };

  const handleTokenOutSelect = () => {
    openDrawer(
      <SwapTokenSelectorDrawer
        mode="output"
        selectedTokenAddress={tokenOut?.contractAddress}
        excludeTokenAddress={tokenIn?.contractAddress}
      />
    );
  };

  // Render token selector button
  const TokenSelectorButton = ({
    token,
    onClick,
    label,
  }: {
    token: any;
    onClick: () => void;
    label: string;
  }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1 p-1 bg-[var(--card-color)]/50 rounded-full hover:bg-[var(--primary-color)]/20 transition-all duration-300 w-fit border border-[var(--primary-color)]/20"
    >
      {token ? (
        <>
          <div className="size-8 flex items-center justify-center rounded-full overflow-hidden flex-shrink-0">
            {token.logo ? (
              <img
                src={token.logo}
                alt={token.symbol}
                className="size-6 rounded-full"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-xs font-medium text-[var(--primary-color-light)]">
                {token.symbol.slice(0, 3)}
              </span>
            )}
          </div>
          <span className="text-[var(--text-color)] font-medium text-nowrap">
            {token.symbol}
          </span>
          <ChevronDown className="size-4 text-[var(--primary-color-light)] flex-shrink-0" />
        </>
      ) : (
        <>
          <div className="size-8 bg-[var(--card-color)]/50 rounded-full flex items-center justify-center border border-[var(--primary-color)]/20">
            <span className="text-[var(--primary-color-light)] text-sm">?</span>
          </div>
          <span className="text-white/60 text-nowrap">{label}</span>
          <ChevronDown className="size-4 text-[var(--primary-color-light)]" />
        </>
      )}
    </button>
  );

  return (
    <div className="max-w-md mx-auto p-2">
      <div className="space-y-4 flex flex-col">
        {/* Swap Interface */}
        <div className="relative flex flex-col gap-1">
          {/* Token In */}
          <div className="space-y-2 border border-[var(--primary-color)]/20 rounded-xl p-4 flex flex-col justify-between bg-[var(--card-color)]/30 relative z-10">
            <div className="flex items-center justify-between">
              <h1 className="text-white/60 font-medium">Sell</h1>
              {tokenIn && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    {formatBalance(tokenInBalance)} {tokenIn.symbol}
                  </span>
                  <button
                    onClick={handleHalfClick}
                    className="text-xs text-[var(--primary-color-light)] hover:text-[var(--primary-color)] transition-all duration-300"
                  >
                    50%
                  </button>
                  <button
                    onClick={handleMaxClick}
                    className="text-xs text-[var(--primary-color-light)] hover:text-[var(--primary-color)] transition-all duration-300"
                  >
                    Max
                  </button>
                </div>
              )}
            </div>

            <div className="">
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="0"
                  value={amountIn}
                  onChange={e => handleAmountInChange(e.target.value)}
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-[var(--text-color)] placeholder-white/40 p-0 focus:ring-0 focus:outline-none"
                  disabled={isLoadingRoute && !isExactIn}
                />
                <TokenSelectorButton
                  token={tokenIn}
                  onClick={handleTokenInSelect}
                  label="Select token"
                />
              </div>
            </div>
            <div>
              {tokenIn && amountIn && parseFloat(amountIn) > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    ~ $
                    {(
                      (parseFloat(amountIn) || 0) * (tokenIn.usdPrice || 0)
                    ).toFixed(2)}
                  </span>
                  {tokenIn.contractAddress &&
                    tokenPrices[tokenIn.contractAddress] &&
                    tokenPrices[tokenIn.contractAddress].priceChange24h !==
                      undefined && (
                      <span
                        className={`text-xs font-medium ${
                          tokenPrices[tokenIn.contractAddress].priceChange24h >=
                          0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatPriceChange(
                          tokenPrices[tokenIn.contractAddress].priceChange24h
                        )}
                      </span>
                    )}
                </div>
              ) : (
                <p className="text-xs text-white/60 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
          {/* Switch Button */}
          <div className="flex justify-center p-1 border border-[var(--primary-color)]/20 bg-[var(--background-color)] w-fit rounded-full z-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-1 w-14 bg-[var(--background-color)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
            <button
              onClick={switchTokens}
              className="p-2 bg-[var(--card-color)]/50 rounded-full hover:bg-[var(--primary-color)]/20 transition-all duration-300 relative z-20 border border-[var(--primary-color)]/20"
              disabled={isLoadingRoute}
            >
              {isLoadingRoute ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary-color-light)]"></div>
              ) : (
                <ArrowUpDown className="size-4 text-[var(--primary-color-light)]" />
              )}
            </button>
          </div>

          <div className="space-y-2 border border-[var(--primary-color)]/20 rounded-xl p-4 flex flex-col justify-between bg-[var(--card-color)]/30">
            <div className="flex items-center justify-between">
              <h1 className="text-white/60 font-medium">Buy</h1>
              {tokenOut && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    {formatBalance(tokenOutBalance)} {tokenOut.symbol}
                  </span>
                </div>
              )}
            </div>

            <div className="">
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="0"
                  value={amountOut}
                  onChange={e => handleAmountOutChange(e.target.value)}
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-[var(--text-color)] placeholder-white/40 p-0 focus:ring-0 focus:outline-none"
                  disabled={isLoadingRoute && !isExactIn}
                />
                <TokenSelectorButton
                  token={tokenOut}
                  onClick={handleTokenOutSelect}
                  label="Select token"
                />
              </div>
            </div>
            <div>
              {tokenOut && amountOut && parseFloat(amountOut) > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    ~ $
                    {(
                      (parseFloat(amountOut) || 0) * (tokenOut.usdPrice || 0)
                    ).toFixed(2)}
                  </span>
                  {tokenOut.contractAddress &&
                    tokenPrices[tokenOut.contractAddress] &&
                    tokenPrices[tokenOut.contractAddress].priceChange24h !==
                      undefined && (
                      <span
                        className={`text-xs font-medium ${
                          tokenPrices[tokenOut.contractAddress]
                            .priceChange24h >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatPriceChange(
                          tokenPrices[tokenOut.contractAddress].priceChange24h
                        )}
                      </span>
                    )}
                </div>
              ) : (
                <p className="text-xs text-white/60 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
        </div>

        {/* Route Info - Hide for wrap/unwrap scenarios */}
        {!isWrapScenario() && !isUnwrapScenario() && (
          <>
            {isLoadingRoute && (
              <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary-color-light)] mr-2"></div>
                <span className="text-sm text-white/60">
                  Finding best route...
                </span>
              </div>
            )}

            {route && !isLoadingRoute && (
              <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Price Impact</span>
                  <span
                    className={`text-sm font-medium ${
                      parseFloat(route.averagePriceImpact) > 5
                        ? 'text-[var(--button-color-destructive)]'
                        : parseFloat(route.averagePriceImpact) > 1
                          ? 'text-[var(--primary-color-light)]'
                          : 'text-[var(--primary-color)]'
                    }`}
                  >
                    {parseFloat(route.averagePriceImpact).toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">
                    Slippage Tolerance
                  </span>
                  <span className="text-sm text-[var(--text-color)]">
                    {slippage}%
                  </span>
                </div>

                {route.execution?.details.hopSwaps &&
                  route.execution.details.hopSwaps.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">Route</span>
                      <div className="flex items-center gap-1">
                        <Zap className="size-3 text-[var(--primary-color-light)]" />
                        <span className="text-xs text-white/60">
                          {route.execution.details.hopSwaps.length} hop
                          {route.execution.details.hopSwaps.length > 1
                            ? 's'
                            : ''}
                        </span>
                      </div>
                    </div>
                  )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Fee</span>
                  <div className="flex items-center gap-1">0.2%</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Exchange Rate for Wrap/Unwrap Operations */}
        {(isWrapScenario() || isUnwrapScenario()) && tokenIn && tokenOut && (
          <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Exchange Rate</span>
              <span className="text-sm text-[var(--text-color)] font-medium">
                1 {tokenIn.symbol} = 1 {tokenOut.symbol}
              </span>
            </div>
            <div className="flex items-center justify-center mt-2">
              <span className="text-xs text-white/50">
                {isWrapScenario()
                  ? 'Wrapping HYPE to WHYPE'
                  : 'Unwrapping WHYPE to HYPE'}{' '}
                • No fees • Instant
              </span>
            </div>
          </div>
        )}

        {routeError && (
          <div className="bg-[var(--button-color-destructive)]/10 border border-[var(--button-color-destructive)]/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--button-color-destructive)]" />
              <span className="text-sm text-[var(--button-color-destructive)]">
                {routeError}
              </span>
            </div>
          </div>
        )}

        {swapError && (
          <div className="bg-[var(--button-color-destructive)]/10 border border-[var(--button-color-destructive)]/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--button-color-destructive)]" />
              <span className="text-sm text-[var(--button-color-destructive)]">
                {swapError}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
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
            ) : !amountIn || !amountOut ? (
              'Enter amount'
            ) : hasInsufficientBalance ? (
              `Insufficient ${tokenIn.symbol} balance`
            ) : routeError ? (
              'No route available'
            ) : !route ? (
              'Finding best route...'
            ) : (
              getActionButtonText()
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Swap;
