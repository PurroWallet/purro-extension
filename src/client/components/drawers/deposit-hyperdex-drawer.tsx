import useDrawerStore from "@/client/hooks/use-drawer-store";
import useDialogStore from "@/client/hooks/use-dialog-store";
import { DepositHyperLiquidDexTransfer } from "../dialogs/deposit-hyperliquid-dex/transfer";
import DepositChain from "../dialogs/deposit-hyperliquid-dex/deposit-chain";

export const DepositHyperDexDrawer = () => {
  const { openDialog } = useDialogStore();
  const { closeDrawer } = useDrawerStore();
  const handleDepositClick = () => {
    closeDrawer();
  };

  return (
    <div className="p-4 flex flex-col gap-2">
      <div
        className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
        onClick={() => {
          handleDepositClick();
          openDialog(<DepositHyperLiquidDexTransfer />);
        }}
      >
        <p className="text-base font-semibold">Transfer from Hyperliquid DEX</p>
      </div>
      <div
        className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
        onClick={() => {
          handleDepositClick();
          openDialog(<DepositChain />);
        }}
      >
        <p className="text-base font-semibold">Deposit USDC from Arbitrum</p>
      </div>
    </div>
  );
};

export default DepositHyperDexDrawer;
