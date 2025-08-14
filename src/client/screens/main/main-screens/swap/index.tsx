import { useState, useEffect, useRef } from "react";
import { Button, Input } from "@/client/components/ui";
import {
  ArrowUpDown,
  ChevronDown,
  AlertTriangle,
  Zap,
} from "lucide-react";
import useSwapStore from "@/client/hooks/use-swap-store";
import useSwapRoute from "@/client/hooks/use-swap-route";
import {
  SwapInputTokenSelectorDrawer,
  SwapOutputTokenSelectorDrawer,
} from "@/client/components/drawers";
import { getTokenLogo } from "@/client/utils/icons";
import useDrawerStore from "@/client/hooks/use-drawer-store";
// Create a comprehensive formatBalance function for display
const formatBalance = (balance: number): string => {
  if (balance === 0) return "0";

  // For very small amounts, show more precision
  if (balance < 0.000001) {
    if (balance < 0.000000001) return "<0.000000001";
    return balance.toExponential(2);
  }

  // For small amounts, show 6 decimal places
  if (balance < 1) return balance.toFixed(6);

  // For medium amounts, show 4 decimal places
  if (balance < 1000) return balance.toFixed(4);

  // For large amounts, use K/M notation
  if (balance < 1000000) return (balance / 1000).toFixed(2) + "K";
  return (balance / 1000000).toFixed(2) + "M";
};

import { sendMessage } from "@/client/utils/extension-message-utils";
import useWalletStore from "@/client/hooks/use-wallet-store";

// Default WHYPE token data
const DEFAULT_WHYPE_TOKEN = {
  address: "0x5555555555555555555555555555555555555555",
  name: "Wrapped HYPE",
  symbol: "WHYPE",
  decimals: 18,
  isERC20Verified: true,
  totalTransfers: 1280900,
  transfers24h: 61195,
};

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
    switchTokens,
    resetAmounts,
  } = useSwapStore();

  const { getActiveAccountWalletObject } = useWalletStore();
  const { openDrawer } = useDrawerStore();
  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Initialize swap route hook
  const { refetchRoute } = useSwapRoute();

  const [swapError, setSwapError] = useState<string | null>(null);

  // Timer state for route refetching
  const [timeLeft, setTimeLeft] = useState(20);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-set WHYPE as default output token if no token is selected
  useEffect(() => {
    if (!tokenOut) {
      const whypeUnifiedToken = {
        contractAddress: DEFAULT_WHYPE_TOKEN.address,
        symbol: DEFAULT_WHYPE_TOKEN.symbol,
        name: DEFAULT_WHYPE_TOKEN.name,
        decimals: DEFAULT_WHYPE_TOKEN.decimals,
        balance: "0",
        chain: "hyperevm" as const,
        chainName: "HyperEVM",
        logo: undefined,
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
      if (typeof token.balance === "string" && token.balance.startsWith("0x")) {
        balanceValue = BigInt(token.balance);
      } else {
        balanceValue = BigInt(token.balance || "0");
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
      console.warn("Error parsing token balance:", error, token);
      return 0;
    }
  };

  const tokenInBalance = tokenIn ? getTokenBalance(tokenIn) : 0;
  const tokenOutBalance = tokenOut ? getTokenBalance(tokenOut) : 0;

  // Timer functions
  const startTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setTimeLeft(20);
    setIsTimerActive(true);

    // Update timer every second
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer finished, refetch route
          if (tokenIn && tokenOut && (amountIn || amountOut)) {
            refetchRoute().then(() => {});
          }
          return 20; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(20);
    setIsTimerActive(false);
  };

  // Start timer when both tokens are selected and there's an amount, but only after initial route is loaded
  useEffect(() => {
    if (tokenIn && tokenOut && (amountIn || amountOut) && !isLoadingRoute && route) {
      // Only start timer if we have a successful route (not immediately after token/amount changes)
      startTimer();
    } else {
      resetTimer();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tokenIn, tokenOut, amountIn, amountOut, isLoadingRoute, route]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Validation
  const inputAmount = parseFloat(amountIn || "0");
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
    if (value === "") {
      setAmountIn("");
      setIsExactIn(true);
      return;
    }

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenIn && value.includes(".")) {
      const maxDecimals = Math.min(tokenIn.decimals || 18, 8);
      const [, decimal] = value.split(".");
      if (decimal && decimal.length > maxDecimals) return;
    }

    setAmountIn(value);
    setIsExactIn(true);
  };

  const handleAmountOutChange = (value: string) => {
    // Allow empty input
    if (value === "") {
      setAmountOut("");
      setIsExactIn(false);
      return;
    }

    // Validate numeric input with decimals
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(value)) return;

    // Limit decimal places based on token decimals
    if (tokenOut && value.includes(".")) {
      const maxDecimals = Math.min(tokenOut.decimals || 18, 8);
      const [, decimal] = value.split(".");
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
        .replace(/\.?0+$/, "");
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
        .replace(/\.?0+$/, "");
      setAmountIn(halfAmount);
      setIsExactIn(true);
    }
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!isValidSwap || !activeAccountAddress || !route) return;

    setIsSwapping(true);
    setSwapError(null);

    try {
      console.log("🔄 Executing swap...", {
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn,
        amountOut,
        route: route.execution,
      });

      if (!route.execution) {
        throw new Error("No execution data in route");
      }

      // Prepare transaction data
      const transactionData = {
        type: "eth_sendTransaction",
        from: activeAccountAddress,
        to: route.execution.to,
        data: route.execution.calldata,
        gas: "0x7A120", // Default gas limit for swaps (500,000)
        chainId: "0x28528", // HyperEVM chain ID
      };

      console.log("📝 Swap transaction data:", transactionData);

      // Send transaction via background script
      const result = await sendMessage("EVM_SEND_TRANSACTION", {
        transaction: transactionData,
      });

      if (result.success) {
        console.log("✅ Swap successful:", result.data);

        // Reset amounts after successful swap
        resetAmounts();

        // Could show success modal here
        alert(`🎉 Swap successful! Transaction hash: ${result.data.hash}`);
      } else {
        throw new Error(result.error || "Swap failed");
      }
    } catch (error) {
      console.error("❌ Swap error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Swap failed";
      setSwapError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  // Token selection handlers
  const handleTokenInSelect = () => {
    openDrawer(
      <SwapInputTokenSelectorDrawer
        selectedTokenAddress={tokenOut?.contractAddress}
      />
    );
  };

  const handleTokenOutSelect = () => {
    openDrawer(
      <SwapOutputTokenSelectorDrawer
        selectedTokenAddress={tokenIn?.contractAddress}
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
            {token.logo || getTokenLogo(token.symbol) ? (
              <img
                src={token.logo || getTokenLogo(token.symbol)}
                alt={token.symbol}
                className="size-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
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
          {/* Timer progress bar */}
          <div
            className={`h-10 shadow-2xl transition-all duration-1000 ease-linear rounded-xl z-10 absolute top-0 left-0 rotate-180 ${
              isTimerActive && "shadow-emerald-400 bg-transparent"
            }`}
            style={{
              width: isTimerActive ? `${((20 - timeLeft) / 20) * 100}%` : "0%",
            }}
          />
          {/* Token In */}
          <div className="space-y-2 border border-[var(--primary-color)]/20 rounded-xl p-4 flex flex-col justify-between bg-[var(--card-color)]/30">
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
                  onChange={(e) => handleAmountInChange(e.target.value)}
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-[var(--text-color)] placeholder-white/40 p-0 focus:ring-0 focus:outline-none"
                  disabled={isLoadingRoute && !isExactIn}
                />
                <TokenSelectorButton
                  token={tokenIn}
                  onClick={handleTokenInSelect}
                  label="Select token"
                />
              </div>

              {/* {hasInsufficientBalance && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Insufficient balance
                </p>
              )} */}
            </div>
            <div>
              {tokenIn && amountIn && parseFloat(amountIn) > 0 ? (
                <p className="text-xs text-white/60">
                  ~ $
                  {(
                    (parseFloat(amountIn) || 0) * (tokenIn.usdPrice || 0)
                  ).toFixed(2)}
                </p>
              ) : (
                <p className="text-xs text-white/60 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
          {/* Switch Button */}
          <div className="flex justify-center p-1 border border-[var(--primary-color)]/20 bg-[var(--background-color)] w-fit rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
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
                  onChange={(e) => handleAmountOutChange(e.target.value)}
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-[var(--text-color)] placeholder-white/40 p-0 focus:ring-0 focus:outline-none"
                  disabled={isLoadingRoute && !isExactIn}
                />
                <TokenSelectorButton
                  token={tokenOut}
                  onClick={handleTokenOutSelect}
                  label="Select token"
                />
              </div>

              {/* {hasInsufficientBalance && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Insufficient balance
                </p>
              )} */}
            </div>
            <div>
              {tokenOut && amountOut && parseFloat(amountOut) > 0 ? (
                <p className="text-xs text-white/60">
                  ~ $
                  {(
                    (parseFloat(amountOut) || 0) * (tokenOut.usdPrice || 0)
                  ).toFixed(2)}
                </p>
              ) : (
                <p className="text-xs text-white/60 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
        </div>

        {/* Route Info */}
        {isLoadingRoute && (
          <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary-color-light)] mr-2"></div>
            <span className="text-sm text-white/60">Finding best route...</span>
          </div>
        )}

        {route && !isLoadingRoute && (
          <div className="bg-[var(--card-color)]/30 border border-[var(--primary-color)]/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Price Impact</span>
              <span
                className={`text-sm font-medium ${
                  parseFloat(route.averagePriceImpact) > 5
                    ? "text-[var(--button-color-destructive)]"
                    : parseFloat(route.averagePriceImpact) > 1
                    ? "text-[var(--primary-color-light)]"
                    : "text-[var(--primary-color)]"
                }`}
              >
                {parseFloat(route.averagePriceImpact).toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Slippage Tolerance</span>
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
                      {route.execution.details.hopSwaps.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}
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

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!isValidSwap || isSwapping || isLoadingRoute}
          variant="primary"
          className="w-full font-medium py-4 text-lg"
        >
          {isSwapping ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Swapping...
            </div>
          ) : !tokenIn || !tokenOut ? (
            "Select tokens"
          ) : !amountIn || !amountOut ? (
            "Enter amount"
          ) : hasInsufficientBalance ? (
            "Insufficient balance"
          ) : routeError ? (
            "No route found"
          ) : (
            "Swap"
          )}
        </Button>
      </div>
    </div>
  );
};

export default Swap;
