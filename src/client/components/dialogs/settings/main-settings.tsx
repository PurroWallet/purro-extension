import useDialogStore from "@/client/hooks/use-dialog-store";
import {
  CircleHelp,
  FileLock2,
  FileText,
  FileX2,
  Globe,
  Plug,
  RotateCcw,
  RotateCcwKey,
  TimerReset,
  XIcon,
  Database,
  SquareDashedBottomCode,
} from "lucide-react";
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from "@/client/components/ui/dialog";
import logo from "@/assets/icon.png";
import { version } from "@/manifest.json";
import Discord from "@/assets/icon-component/discord";
import XTwitter from "@/assets/icon-component/x-twitter";
import Telegram from "@/assets/icon-component/telegram";
import { Menu } from "../../ui/menu";

interface MainSettingsProps {
  onConnectedDApps: () => void;
  onAutoLockTime: () => void;
  onChangePassword: () => void;
  onDeleteSeedPhrase: () => void;
  onResetWallet: () => void;
  onActiveNetwork: () => void;
  onDeveloperMode: () => void;
}

const MainSettings = ({
  onConnectedDApps,
  onAutoLockTime,
  onChangePassword,
  onDeleteSeedPhrase,
  onResetWallet,
  onActiveNetwork,
  onDeveloperMode,
}: MainSettingsProps) => {
  const { closeDialog } = useDialogStore();

  return (
    <DialogWrapper>
      <DialogHeader
        title="Settings"
        onClose={() => closeDialog()}
        icon={<XIcon className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="space-y-4">
          <Menu
            items={[
              {
                icon: Plug,
                label: "Connected DApps",
                onClick: onConnectedDApps,
                arrowLeft: true,
              },
              {
                icon: Globe,
                label: "Active Network",
                onClick: onActiveNetwork,
                arrowLeft: true,
              },
              {
                icon: SquareDashedBottomCode,
                label: "Developer Mode",
                onClick: onDeveloperMode,
                arrowLeft: true,
              },
            ]}
          />

          <Menu
            items={[
              {
                icon: TimerReset,
                label: "Auto-Lock Time",
                onClick: onAutoLockTime,
                arrowLeft: true,
              },
              {
                icon: RotateCcwKey,
                label: "Change Password",
                onClick: onChangePassword,
                arrowLeft: true,
              },
              {
                icon: FileX2,
                label: "Remove Seedphrase",
                onClick: onDeleteSeedPhrase,
                itemClassName: "text-red-400",
                arrowLeft: true,
              },
              {
                icon: RotateCcw,
                label: "Reset Wallet",
                onClick: onResetWallet,
                itemClassName: "text-red-400",
                arrowLeft: true,
              },
            ]}
          />

          <Menu
            items={[
              {
                icon: CircleHelp,
                label: "Help & Support",
                onClick: () => window.open("https://purro.xyz/help", "_blank"),
                arrowLeft: true,
              },
              {
                icon: FileText,
                label: "Terms of Service",
                onClick: () => window.open("https://purro.xyz/terms", "_blank"),
                arrowLeft: true,
              },
              {
                icon: FileLock2,
                label: "Privacy Policy",
                onClick: () =>
                  window.open("https://purro.xyz/privacy", "_blank"),
                arrowLeft: true,
              },
            ]}
          />

          <Menu
            items={[
              {
                icon: Discord,
                label: "Discord",
                onClick: () =>
                  window.open("https://discord.gg/VJunuK9T5w", "_blank"),
                arrowLeft: true,
              },
              {
                icon: XTwitter,
                label: "X (Twitter)",
                onClick: () => window.open("https://x.com/purro_xyz", "_blank"),
                arrowLeft: true,
              },
              {
                icon: Telegram,
                label: "Telegram",
                onClick: () => window.open("https://t.me/purro_xyz", "_blank"),
                arrowLeft: true,
              },
            ]}
          />

          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <img src={logo} alt="logo" className="size-10" />
              <p className="text-lg text-white font-livvic">PURRO</p>
            </div>
            <p className="text-sm text-white/50">v{version}</p>
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};

export default MainSettings;
