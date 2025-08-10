import { useCallback } from "react";
import { DialogContent, DialogHeader, DialogWrapper } from "../../ui/dialog";
import { Switch } from "../../ui/switch";
import useDevModeStore from "@/client/hooks/use-dev-mode";

const DeveloperMode = ({ onBack }: { onBack: () => void }) => {
  const { isDevMode, isChanging, setIsDevMode } = useDevModeStore();

  const handleToggle = useCallback(() => {
    if (isChanging) return;
    setIsDevMode(!isDevMode);
  }, [isDevMode, setIsDevMode, isChanging]);

  return (
    <DialogWrapper>
      <DialogHeader title="Developer Mode" onClose={onBack} />
      <DialogContent className="p-4 flex-1 overflow-y-auto relative">
        <div className="flex items-center justify-between">
          <p className="text-base text-white/80">Enable developer mode</p>
          <Switch
            checked={isDevMode}
            onCheckedChange={handleToggle}
            disabled={isChanging}
          />
        </div>
        <p className="text-sm text-white/50 mt-2">
          Developer mode allows you to access to testnet & advanced settings.
          This mode is only available for developers and should not be enabled
          by default.
        </p>
      </DialogContent>
    </DialogWrapper>
  );
};

export default DeveloperMode;
