import { formatCurrency } from "@/client/utils/formatters";
import TabsLoading from "./tabs-loading";
import TabsError from "./tabs-error";
import { useState, useEffect } from "react";
import { AlertTriangle, PlusIcon } from "lucide-react";
import { useUnifiedTokens } from "@/client/hooks/use-unified-tokens";
import TokenList from "@/client/components/token-list";
import useDevModeStore from "@/client/hooks/use-dev-mode";
import useDialogStore from "@/client/hooks/use-dialog-store";
import AddTestnetToken from "@/client/components/dialogs/add-testnet-token";

const WalletTabsEVM = () => {
  // Track performance
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const { isDevMode } = useDevModeStore();
  const { openDialog, closeDialog } = useDialogStore();

  // Use the unified tokens hook
  const {
    allUnifiedTokens,
    totalBalance,
    totalTokenCount,
    isLoading,
    hasError,
    hasCriticalError,
    isAlchemyLoading,
    alchemyTokenCount,
  } = useUnifiedTokens();

  // Track loading performance
  useEffect(() => {
    if (isAlchemyLoading && !loadStartTime) {
      setLoadStartTime(Date.now());
    } else if (!isAlchemyLoading && loadStartTime) {
      setLoadStartTime(null);
    }
  }, [isAlchemyLoading, loadStartTime, alchemyTokenCount]);

  if (isLoading) return <TabsLoading />;

  // Only show error if we have critical errors and no data at all
  if (hasCriticalError && totalBalance === 0 && allUnifiedTokens.length === 0) {
    return <TabsError />;
  }

  return (
    <div className="space-y-6 p-2">
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

      {isDevMode && (
        <div className="w-full flex justify-center">
          <button
            className="flex items-center gap-2 cursor-pointer hover:underline p-2 text-sm text-white/80"
            onClick={() =>
              openDialog(<AddTestnetToken onClose={() => closeDialog()} />)
            }
          >
            <PlusIcon className="size-5" />
            <span>Add Testnet Token</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletTabsEVM;
