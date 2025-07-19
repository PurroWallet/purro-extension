import useDrawerStore from "@/client/hooks/use-drawer-store";
import useDialogStore from "@/client/hooks/use-dialog-store";
import { SendOnEVM, SendOnHyperDex } from "../dialogs";

export const SendDrawer = () => {
  const { openDialog } = useDialogStore();
  const { closeDrawer } = useDrawerStore();
  const handleSendClick = () => {
    closeDrawer();
  };

  return (
    <div className="p-4 flex flex-col gap-2">
      <div
        className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
        onClick={() => {
          handleSendClick();
          openDialog(<SendOnHyperDex />);
        }}
      >
        <p className="text-base font-semibold">Send on Hyperliquid DEX</p>
      </div>
      <div
        className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
        onClick={() => {
          handleSendClick();
          openDialog(<SendOnEVM />);
        }}
      >
        <p className="text-base font-semibold">
          Send on HyperEVM & Supported Chains
        </p>
      </div>
    </div>
  );
};

export default SendDrawer;
