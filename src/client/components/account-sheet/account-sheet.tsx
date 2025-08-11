import { ArrowLeft, Lock, Plus, Settings } from "lucide-react";
import { cn } from "@/client/lib/utils";
import useAccountSheetStore from "@/client/hooks/use-account-sheet-store";
import { useState } from "react";
import SupportedChainsDropdown from "./supported-chains-dropdown";
import AccountList from "./account-list";
import useDialogStore from "@/client/hooks/use-dialog-store";
import useWallet from "@/client/hooks/use-wallet";
import SettingsDialog from "../dialogs/settings/settings-dialog";

const AccountSheet = () => {
  const { isOpen, close } = useAccountSheetStore();
  const { openDialog } = useDialogStore();
  const { lockWallet } = useWallet();
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);

  const toggleChainDropdown = () => {
    setIsChainDropdownOpen(!isChainDropdownOpen);
  };

  const handleLockWallet = () => {
    lockWallet();
    window.location.reload();
  };

  const handleOpenDialog = () => {
    openDialog(<SettingsDialog />);
    close();
  };

  const isConnect = window.location.pathname.includes("connect.html");

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[var(--background-color)]/10 backdrop-blur-[2px] z-[41] transition-opacity duration-300"
          onClick={close}
        />
      )}

      <div
        className={cn(
          "fixed top-0 left-0 h-full w-4/5 bg-[var(--card-color)] shadow-2xl z-[42] transform transition-transform duration-300 ease-out overflow-y-auto flex flex-col rounded-r-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-white/10">
          <SupportedChainsDropdown
            isOpen={isChainDropdownOpen}
            onToggle={toggleChainDropdown}
          />
          <button
            onClick={close}
            className="size-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <AccountList />
        </div>

        {!isConnect && (
          <div className="grid grid-cols-3 justify-between items-center border-t border-white/10 w-full">
            <button
              className="size-full px-2 py-3 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
              onClick={() => {
                window.open("import.html", "_blank");
              }}
            >
              <Plus className="size-5" />
            </button>
            <button
              className="size-full px-2 py-3 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
              onClick={handleOpenDialog}
            >
              <Settings className="size-5" />
            </button>
            <button
              className="size-full px-2 py-3 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
              onClick={handleLockWallet}
            >
              <Lock className="size-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AccountSheet;
