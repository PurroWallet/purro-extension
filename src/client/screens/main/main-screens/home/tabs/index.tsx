import { useState, useRef, useEffect } from "react";
import Spot from "./spot";
import Perps from "./perps";
import Evm from "./evm";
import { Settings2, SquareDashedBottomCode } from "lucide-react";
import useNetworkSettingsStore from "@/client/hooks/use-network-store";
import DropdownSettings from "./dropdown-settings";
import useHomeTabsStore from "@/client/hooks/use-home-tabs-store";
import useDevModeStore from "@/client/hooks/use-dev-mode";

const WalletTabs = () => {
  const { isDevMode } = useDevModeStore();

  const { activeTab, setActiveTab } = useHomeTabsStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { isHyperliquidDexEnabled, toggleHyperliquidDex } =
    useNetworkSettingsStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (!isHyperliquidDexEnabled && isDevMode) {
      setActiveTab("evm");
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isHyperliquidDexEnabled, setActiveTab]);

  return (
    <div className="relative mt-2">
      <div className="absolute top-0 right-0 left-0">
        <div className="border-white/10 sticky top-0 z-[11] flex border-b bg-[var(--background-color)] ">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "evm"
                ? "text-[var(--primary-color-light)] border-[var(--primary-color-light)] border-b-2"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("evm")}
          >
            EVM{" "}
            {isDevMode && (
              <span className="text-xs text-muted-foreground">Testnet</span>
            )}
          </button>

          {isHyperliquidDexEnabled && (
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "spot"
                  ? "text-[var(--primary-color-light)] border-[var(--primary-color-light)] border-b-2"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("spot")}
            >
              Spot
            </button>
          )}
          {isHyperliquidDexEnabled && (
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "perpetuals"
                  ? "text-[var(--primary-color-light)] border-[var(--primary-color-light)] border-b-2"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("perpetuals")}
            >
              Perpetuals
            </button>
          )}

          {/* Settings Dropdown Button */}
          {!isDevMode ? (
            <button
              ref={buttonRef}
              className="absolute top-1 right-2 z-10 transition-colors cursor-pointer size-8 flex items-center justify-center rounded-full hover:bg-white/10"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <Settings2 className="size-5" />
            </button>
          ) : (
            <div className="absolute top-1 right-2 z-10 transition-colors cursor-pointer h-8 flex items-center justify-center rounded-full gap-2">
              <SquareDashedBottomCode className="size-5" /> Dev Mode
            </div>
          )}

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <DropdownSettings
              isHyperliquidDexEnabled={isHyperliquidDexEnabled}
              toggleHyperliquidDex={toggleHyperliquidDex}
            />
          )}
        </div>
        {activeTab === "evm" && <Evm />}
        {activeTab === "spot" && isHyperliquidDexEnabled && <Spot />}
        {activeTab === "perpetuals" && isHyperliquidDexEnabled && <Perps />}
      </div>
    </div>
  );
};

export default WalletTabs;
