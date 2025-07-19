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
        {mainScreen === "history" && <History />}
        {mainScreen === "nft" && <Nft />} */}
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
        "flex items-center justify-center py-4 transition-all duration-300 cursor-pointer group relative overflow-hidden",
        "hover:bg-white/5 active:scale-95",
        isActive && "border-t border-[var(--primary-color-light)]"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "transition-all duration-500 ease-out relative z-10",
          "group-hover:scale-110 group-hover:rotate-12 group-hover:-translate-y-1",
          "group-active:scale-90 group-active:rotate-0 group-active:translate-y-0",
          // Hiệu ứng khi active - tinh tế hơn
          isActive && "scale-105 -translate-y-0.5"
        )}
      >
        {icon}
      </div>
    </button>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Main />);
}
