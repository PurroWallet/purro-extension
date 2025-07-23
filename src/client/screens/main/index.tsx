import LockDisplay from "@/client/components/display/lock-display";
import { Dialog, Drawer } from "@/client/components/ui";
import useInit from "@/client/hooks/use-init";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import MainHeader, {
  HistoryNotification,
  NftNetworkNotification,
} from "./main-header";
import { cn } from "@/client/lib/utils";
import { Clock, HomeIcon, ImageIcon } from "lucide-react";
import AccountSheet from "@/client/components/account-sheet/account-sheet";
import Home from "./main-screens/home";
import Nft from "./main-screens/nft";

const queryClient = new QueryClient();

const Main = () => {
  useInit();

  return (
    <QueryClientProvider client={queryClient}>
      <LockDisplay />
      <Dialog />
      <Drawer />
      <AccountSheet />
      <MainContent />
    </QueryClientProvider>
  );
};

export const MainContent = () => {
  const [mainScreen, setMainScreen] = useState<
    "home" | "explore" | "nft" | "history"
  >("home");
  const [isNftNetworkVisible, setIsNftNetworkVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const handleNftNetworkToggle = () => {
    setIsNftNetworkVisible(!isNftNetworkVisible);
  };

  return (
    <div className="size-full relative flex flex-col h-screen">
      <MainHeader
        className={cn(
          mainScreen === "home" && "bg-[var(--primary-color)] border-b-0"
        )}
        currentScreen={mainScreen}
        onNftNetworkToggle={handleNftNetworkToggle}
        isNftNetworkVisible={isNftNetworkVisible}
        isHistoryVisible={isHistoryVisible}
        onHistoryToggle={() => setIsHistoryVisible(!isHistoryVisible)}
      />
      {mainScreen === "nft" && (
        <NftNetworkNotification isVisible={isNftNetworkVisible} />
      )}
      {mainScreen === "history" && (
        <HistoryNotification isVisible={isHistoryVisible} />
      )}
      <div className="flex-1 overflow-y-auto">
        {mainScreen === "home" && <Home />}
        {/* {mainScreen === "explore" && <Explore />}
        {mainScreen === "history" && <History />}*/}
        {mainScreen === "nft" && <Nft />}
      </div>

      <div className="grid grid-cols-3 w-full border-t border-white/10">
        <MainScreenTabButton
          isActive={mainScreen === "home"}
          onClick={() => setMainScreen("home")}
          icon={
            <HomeIcon
              className={cn(
                mainScreen === "home" && "text-[var(--primary-color-light)]"
              )}
            />
          }
        />
        <MainScreenTabButton
          isActive={mainScreen === "nft"}
          onClick={() => setMainScreen("nft")}
          icon={
            <ImageIcon
              className={cn(
                mainScreen === "nft" && "text-[var(--primary-color-light)]"
              )}
            />
          }
        />
        <MainScreenTabButton
          isActive={mainScreen === "history"}
          onClick={() => setMainScreen("history")}
          icon={
            <Clock
              className={cn(
                mainScreen === "history" && "text-[var(--primary-color-light)]"
              )}
            />
          }
        />
        {/* <MainScreenTabButton
          isActive={mainScreen === "explore"}
          onClick={() => setMainScreen("explore")}
          icon={
            <Search
              className={cn(
                mainScreen === "explore" && "text-[var(--primary-color-light)]"
              )}
            />
          }
        /> */}
      </div>
    </div>
  );
};

const MainScreenTabButton = ({
  isActive,
  onClick,
  icon,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) => {
  return (
    <button
      className={cn(
        "flex items-center justify-center py-4 transition-all cursor-pointer relative overflow-hidden",
        "hover:bg-white/5",
        "before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:transition-all",
        isActive && "before:bg-[var(--primary-color-light)]"
      )}
      onClick={onClick}
    >
      <div className={cn("transition-all relative z-10")}>{icon}</div>
    </button>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Main />);
}
