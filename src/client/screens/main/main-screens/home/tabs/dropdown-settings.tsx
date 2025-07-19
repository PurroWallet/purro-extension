import { useRef } from "react";
import hyperliquidLogo from "@/assets/logo/hl-mint-logo.png";
import { Switch } from "@/client/components/ui";

const DropdownSettings = ({
  isHyperliquidDexEnabled,
  toggleHyperliquidDex,
}: {
  isHyperliquidDexEnabled: boolean;
  toggleHyperliquidDex: () => void;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-10 right-2 z-20 w-64 bg-[var(--card-color)] border border-white/10 rounded-lg shadow-lg p-3 space-y-3"
    >
      {/* Hyperliquid DEX Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 flex items-center justify-center rounded-full bg-white/10">
            <img src={hyperliquidLogo} alt="Hyperliquid" className="size-3" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">DEX</div>
            <div className="text-xs text-muted-foreground">
              Spot & Perpetuals
            </div>
          </div>
        </div>
        <Switch
          checked={isHyperliquidDexEnabled}
          onCheckedChange={toggleHyperliquidDex}
        />
      </div>
    </div>
  );
};

export default DropdownSettings;
