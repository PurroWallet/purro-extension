import ShuffleIcon from "@/assets/icon-component/shuffle-icon";
import SwapVertIcon from "@/assets/icon-component/swap-vert-icon";
import { CircleFadingPlus, EyeIcon } from "lucide-react";
import SendIcon from "@/assets/icon-component/send-icon";
import useWalletStateStore from "@/store/wallet-state-store";
import { cn } from "@/lib/utils";
import WalletTabs from "./tabs";
import OptimizedBalanceRender from "@/components/optimized-balance-render";

const OptimizedHome = () => {
  const { activeAccount } = useWalletStateStore();
  const isWatchOnly = activeAccount?.type === "watchOnly";

  return (
    <div>
      <div className="text-center h-48">
        <div
          className={cn(
            "bg-[var(--primary-color)] h-36 relative pt-4",
            isWatchOnly && "h-[155px]"
          )}
        >
          {/* Optimized Balance Display */}
          <OptimizedBalanceRender showChainBreakdown={false} className="mb-4" />

          {/* Watch Only Badge */}
          {isWatchOnly && (
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 w-fit mb-2">
                <EyeIcon className="size-4" />
                <p className="text-white text-xs">Watch Only</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-4 bg-[var(--primary-color-dark)] w-[90%] rounded-2xl absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 items-center overflow-hidden">
            <ActionButton
              icon={
                <SendIcon className="text-[var(--primary-color-light)] size-5" />
              }
              onClick={() => {}}
              disabled={isWatchOnly}
            >
              Send
            </ActionButton>
            <ActionButton
              icon={
                <CircleFadingPlus className="text-[var(--primary-color-light)] size-5" />
              }
              onClick={() => {}}
            >
              Receive
            </ActionButton>
            <ActionButton
              icon={
                <SwapVertIcon className="text-[var(--primary-color-light)]" />
              }
              onClick={() => {}}
              disabled={isWatchOnly}
            >
              Swap
            </ActionButton>
            <ActionButton
              icon={
                <ShuffleIcon className="text-[var(--primary-color-light)]" />
              }
              onClick={() => {}}
              disabled={isWatchOnly}
            >
              Bridge
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Enhanced Wallet Tabs with optimized data */}
      <WalletTabs />
    </div>
  );
};

interface ActionButtonProps {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const ActionButton = ({
  children,
  icon,
  onClick,
  disabled = false,
}: ActionButtonProps) => {
  return (
    <button
      className={cn(
        "flex flex-col items-center py-4 transition-all duration-300 cursor-pointer text-[var(--primary-color-light)] pt-5",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-white/10 active:scale-95"
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon}
      {children}
    </button>
  );
};

export default OptimizedHome;
