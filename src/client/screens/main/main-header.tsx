import DockToLeftIcon from "@/assets/icon-component/dock-to-left-icon";
import { hyperliquidLogo } from "@/assets/logo";
import { AccountIcon, AccountName } from "@/client/component/account";
import { openSidePanel } from "@/client/lib/utils";
import { cn } from "@/client/lib/utils";
import { X } from "lucide-react";
import useWalletStore from "@/client/hooks/use-wallet-store";
import useAccountSheetStore from "@/client/hooks/use-account-sheet-store";

const MainHeader = ({
  className,
  currentScreen,
  onNftNetworkToggle,
  isNftNetworkVisible,
  isHistoryVisible,
  onHistoryToggle,
}: {
  className?: string;
  currentScreen: "home" | "explore" | "nft" | "history";
  onNftNetworkToggle?: () => void;
  onHistoryToggle?: () => void;
  isNftNetworkVisible: boolean;
  isHistoryVisible: boolean;
}) => {
  const { activeAccount } = useWalletStore();
  const { open: openAccountSheet } = useAccountSheetStore();
  const isSidepanel = window.location.pathname.includes("sidepanel.html");
  const isNftScreen = currentScreen === "nft";
  const isHistoryScreen = currentScreen === "history";

  console.log(activeAccount);

  return (
    <div
      className={cn(
        "p-3 flex items-center justify-between border-b border-white/10 z-[40] relative",
        className
      )}
    >
      <div
        className="flex items-center gap-2 pr-3 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
        onClick={openAccountSheet}
      >
        <div className="size-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
          <AccountIcon icon={activeAccount?.icon} alt="Account" />
        </div>
        <AccountName name={activeAccount?.name} />
      </div>

      {!isSidepanel && !isNftScreen && !isHistoryScreen && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-full p-2 transition-all duration-300"
          onClick={async () => {
            await openSidePanel();
          }}
        >
          <DockToLeftIcon className="size-5 text-white/90" />
        </div>
      )}

      {isNftScreen && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-full p-2 transition-all duration-300"
          onClick={onNftNetworkToggle}
        >
          {!isNftNetworkVisible ? (
            <img src={hyperliquidLogo} alt="Hyperliquid" className="size-5" />
          ) : (
            <X className="size-5 text-white/90" />
          )}
        </div>
      )}

      {isHistoryScreen && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-full p-2 transition-all duration-300"
          onClick={onHistoryToggle}
        >
          {!isHistoryVisible ? (
            <img src={hyperliquidLogo} alt="Hyperliquid" className="size-5" />
          ) : (
            <X className="size-5 text-white/90" />
          )}
        </div>
      )}
    </div>
  );
};

export const NftNetworkNotification = ({
  isVisible,
}: {
  isVisible: boolean;
}) => {
  return (
    <div
      className={cn(
        "bg-[var(--card-color)] border-b border-white/10 w-full overflow-hidden transition-all duration-300 ease-in-out",
        isVisible ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="p-2">
        <p className="text-white/90 text-sm">
          You are viewing NFTs on Hyperliquid. Orther networks will be available
          soon.
        </p>
      </div>
    </div>
  );
};

export const HistoryNotification = ({ isVisible }: { isVisible: boolean }) => {
  return (
    <div
      className={cn(
        "bg-[var(--card-color)] border-b border-white/10 w-full overflow-hidden transition-all duration-300 ease-in-out",
        isVisible ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="p-2">
        <p className="text-white/90 text-sm">
          You are viewing history on Hyperliquid. Orther networks will be
          available soon.
        </p>
      </div>
    </div>
  );
};

export default MainHeader;
