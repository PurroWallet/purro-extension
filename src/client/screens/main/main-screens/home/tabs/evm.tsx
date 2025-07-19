import { formatCurrency } from "@/client/utils/formatters";
import TabsLoading from "./tabs-loading";
import TabsError from "./tabs-error";
import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useUnifiedTokens } from "@/client/hooks/use-unified-tokens";
import TokenList from "@/client/components/token-list";

const WalletTabsEVM = () => {
  // Track performance
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

  // Use the unified tokens hook
  const {
    allUnifiedTokens,
    totalBalance,
    totalTokenCount,
    isLoading,
    hasError,
    hasCriticalError,
    evmError,
    hasAlchemyError,
    hasNativeError,
    isAlchemyLoading,
    alchemyTokenCount,
  } = useUnifiedTokens();

  // Debug logging
  console.log("🔍 EVM Tab - useUnifiedTokens Debug:", {
    totalBalance,
    totalTokenCount,
    allUnifiedTokensLength: allUnifiedTokens?.length || 0,
    isLoading,
    hasError,
    hasNativeError,
    nativeTokensCount: allUnifiedTokens?.filter((t) => t.isNative).length || 0,
  });

  // Track loading performance
  useEffect(() => {
    if (isAlchemyLoading && !loadStartTime) {
      setLoadStartTime(Date.now());
      console.log("🚀 EVM Tab: Starting token fetch with optimized caching");
    } else if (!isAlchemyLoading && loadStartTime) {
      const loadTime = Date.now() - loadStartTime;
      console.log(
        `✅ EVM Tab: Loaded ${alchemyTokenCount} tokens in ${loadTime}ms (with metadata cache optimization)`
      );
      setLoadStartTime(null);
    }
  }, [isAlchemyLoading, loadStartTime, alchemyTokenCount]);

  // Log errors for debugging
  if (evmError) {
    console.error("EVM Data Error:", evmError);
  }
  if (hasAlchemyError) {
    console.error("Alchemy Data Error:", hasAlchemyError);
  }
  if (hasNativeError) {
    console.error("Native Balance Error:", hasNativeError);
  }

  if (isLoading) return <TabsLoading />;

  // Only show error if we have critical errors and no data at all
  if (hasCriticalError && totalBalance === 0 && allUnifiedTokens.length === 0) {
    // Log detailed error info for debugging
    console.error("EVM Tab Critical Error Details:", {
      evmError,
      hasAlchemyError,
      hasNativeError,
      allUnifiedTokensLength: allUnifiedTokens?.length,
      totalBalance,
    });
    return <TabsError />;
  }

  // Debug final state before render
  console.log("🔍 EVM Tab Final State:", {
    isLoading,
    hasError,
    hasCriticalError,
    totalBalance,
    totalTokenCount,
    allUnifiedTokensLength: allUnifiedTokens?.length || 0,
    showingData: totalBalance > 0 || allUnifiedTokens.length > 0,
  });

  return (
    <div className="space-y-6 p-2">
      {/* Show simple warning for any errors */}
      {hasError && !isLoading ? (
        <div className="bg-orange-500/10 border border-orange-500/10 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-7 text-orange-300" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Some data couldn't be fetched</p>
              <p className="text-xs mt-1 opacity-70">
                Try refreshing if needed
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Account Summary */}
      <div className="mb-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-2">
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Total Balance</div>
            <div className="font-semibold text-lg">
              {formatCurrency(totalBalance)}
            </div>
          </div>
          <div className="bg-[var(--card-color)] rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Total Tokens</div>
            <div className="font-semibold text-lg">{totalTokenCount}</div>
          </div>
        </div>
      </div>

      {/* Unified Token List - Sorted by Value */}
      <div>
        <TokenList
          tokens={allUnifiedTokens}
          emptyMessage="No tokens found across all supported chains"
        />
      </div>
    </div>
  );
};

export default WalletTabsEVM;
