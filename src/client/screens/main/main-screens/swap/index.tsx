import { useState, useEffect, useRef } from "react";
import { Button, Input } from "@/client/components/ui";
import {
  ArrowUpDown,
  Settings,
  ChevronDown,
  AlertTriangle,
  Zap,
} from "lucide-react";
import useSwapStore from "@/client/hooks/use-swap-store";
import useSwapRoute from "@/client/hooks/use-swap-route";
import {
  SwapInputTokenSelectorDrawer,
  SwapOutputTokenSelectorDrawer,
  SwapSettingsDrawer,
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

  const handleSettingsClick = () => {
    openDrawer(<SwapSettingsDrawer />);
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
      className="flex items-center gap-1 p-1 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors w-fit border border-white/10"
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
              <span className="text-xs font-medium text-gray-400">
                {token.symbol.slice(0, 3)}
              </span>
            )}
          </div>
          <span className="text-white font-medium text-nowrap">
            {token.symbol}
          </span>
          <ChevronDown className="size-4 text-gray-400 flex-shrink-0" />
        </>
      ) : (
        <>
          <div className="size-8 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-gray-400 text-sm">?</span>
          </div>
          <span className="text-gray-400 text-nowrap">{label}</span>
          <ChevronDown className="size-4 text-gray-400" />
        </>
      )}
    </button>
  );

  return (
    <div className="max-w-md mx-auto px-6 py-4">
      <div className="space-y-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Swap</h1>
          <button
            onClick={handleSettingsClick}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Settings className="size-4 text-gray-400" />
          </button>
        </div>

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
          <div className="space-y-2 border border-white/10 rounded-xl p-4 flex flex-col justify-between bg-[var(--background-color)] relative z-10">
            <div className="flex items-center justify-between">
              <h1 className="text-gray-400">Sell</h1>
              {tokenIn && (
                <div className="flex items-center gap-2">
                  <span className="text-xs ">
                    {formatBalance(tokenInBalance)} {tokenIn.symbol}
                  </span>
                  <button
                    onClick={handleHalfClick}
                    className="text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    Half
                  </button>
                  <button
                    onClick={handleMaxClick}
                    className="text-xs text-gray-300 hover:text-white transition-colors"
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
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-white placeholder-gray-500 p-0 focus:ring-0 focus:outline-none"
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
                <p className="text-xs text-gray-400">
                  ~ $
                  {(
                    (parseFloat(amountIn) || 0) * (tokenIn.usdPrice || 0)
                  ).toFixed(2)}
                </p>
              ) : (
                <p className="text-xs text-gray-400 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
          {/* Switch Button */}
          <div className="flex justify-center p-1 border border-white/10 bg-[var(--background-color)] w-fit rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="h-1 w-14 bg-[var(--background-color)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
            <button
              onClick={switchTokens}
              className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors relative z-20"
              disabled={isLoadingRoute}
            >
              {isLoadingRoute ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <ArrowUpDown className="size-4 text-[var(--primary-color)]" />
              )}
            </button>
          </div>

          <div className="space-y-2 border border-white/10 rounded-xl p-4 flex flex-col justify-between bg-gray-800">
            <div className="flex items-center justify-between">
              <h1 className="text-gray-400">Buy</h1>
              {tokenOut && (
                <div className="flex items-center gap-2">
                  <span className="text-xs ">
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
                  className="flex-1 bg-transparent border-none text-4xl font-medium text-white placeholder-gray-500 p-0 focus:ring-0 focus:outline-none"
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
                <p className="text-xs text-gray-400">
                  ~ $
                  {(
                    (parseFloat(amountOut) || 0) * (tokenOut.usdPrice || 0)
                  ).toFixed(2)}
                </p>
              ) : (
                <p className="text-xs text-gray-400 opacity-0">~ $0.00</p>
              )}
            </div>
          </div>
        </div>

        {/* Route Info */}
        {isLoadingRoute && (
          <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
            <span className="text-sm text-gray-400">Finding best route...</span>
          </div>
        )}

        {route && !isLoadingRoute && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Price Impact</span>
              <span
                className={`text-sm font-medium ${
                  parseFloat(route.averagePriceImpact) > 5
                    ? "text-red-400"
                    : parseFloat(route.averagePriceImpact) > 1
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {parseFloat(route.averagePriceImpact).toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Slippage Tolerance</span>
              <span className="text-sm text-white">{slippage}%</span>
            </div>

            {route.execution?.details.hopSwaps &&
              route.execution.details.hopSwaps.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Route</span>
                  <div className="flex items-center gap-1">
                    <Zap className="size-3 text-blue-400" />
                    <span className="text-xs text-gray-400">
                      {route.execution.details.hopSwaps.length} hop
                      {route.execution.details.hopSwaps.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}
          </div>
        )}

        {routeError && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-400" />
              <span className="text-sm text-red-400">{routeError}</span>
            </div>
          </div>
        )}

        {swapError && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-400" />
              <span className="text-sm text-red-400">{swapError}</span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!isValidSwap || isSwapping || isLoadingRoute}
          className="w-full bg-[var(--primary-color)] text-white hover:text-black hover:bg-[var(--primary-color-light)] disabled:bg-gray-700 disabled:text-gray-500 font-medium py-4 text-lg"
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
