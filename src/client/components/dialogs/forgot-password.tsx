import useDialogStore from "@/client/hooks/use-dialog-store";
import { Lock, XIcon } from "lucide-react";
import { Button, DialogFooter, DialogHeader } from "../ui";
import useWallet from "@/client/hooks/use-wallet";

const ForgotPassword = () => {
  const { closeDialog } = useDialogStore();
  const { resetWallet } = useWallet();
  const handleResetWallet = () => {
    if (confirm("Are you sure you want to reset your wallet?")) {
      resetWallet();
      window.close();
    }
  };
  const handleOpenWhy = () => {
    window.open("https://docs.purro.xyz/faq/why-reset-wallet", "_blank");
  };

  return (
    <>
      <DialogHeader
        title="Forgot Password"
        onClose={() => closeDialog()}
        icon={<XIcon className="size-4 text-white" />}
      />
      <div className="p-2 flex-1 overflow-y-auto flex flex-col justify-center items-center gap-4">
        <div className="flex items-center justify-center size-18 bg-[var(--card-color)] rounded-full">
          <Lock className="size-10 text-white" />
        </div>
        <p className="text-lg font-semibold text-gray-500 text-center mt-4">
          If you forgot your password, you can reset your wallet by clicking the
          button below.
        </p>
        <p className="text-base text-gray-500 text-center mt-4">
          Your wallet password is stored locally on your device for security.
          When forgotten, it cannot be recovered directly. Resetting and
          restoring with your seed phrase is the only way to regain access to
          your wallet and funds.
        </p>

        <button
          className="text-base text-gray-500 font-semibold cursor-pointer text-center mt-4 hover:underline transition-all duration-300"
          onClick={handleOpenWhy}
        >
          Why this happen?
        </button>
      </div>
      <DialogFooter className="flex-col">
        <Button className="w-full" onClick={closeDialog}>
          Retry Password
        </Button>
        <Button
          className="w-full bg-[var(--button-color-destructive)]"
          onClick={handleResetWallet}
        >
          Reset Wallet
        </Button>
      </DialogFooter>
    </>
  );
};

export default ForgotPassword;
