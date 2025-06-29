import useWallet from "@/client/hooks/use-wallet";
import { cn } from "@/client/lib/utils";
import Header from "@/client/component/common/header";
import { useState } from "react";
import logo from "@/assets/icon.png";
import useDialogStore from "@/client/hooks/use-dialog-store";
// import ForgotPassword from "@/client/screens/forgot-password";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { Button, InputPassword } from "@/client/component/ui";
import LoadingDisplay from "@/client/component/display/loading-display";

const LockDisplay = () => {
  const { loading, isLocked, hasWallet } = useWalletStore();
  // const { unlockWallet, loading } = useWallet();
  const [password, setPassword] = useState("");
  const [hasError, setHasError] = useState(false);
  const { openDialog } = useDialogStore();

  const handleUnlock = async () => {
    try {
      // await unlockWallet(password);
    } catch (error) {
      setHasError(true);
    }
  };

  const onChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (hasError) {
      setHasError(false);
    }
  };

  if (loading) {
    return <LoadingDisplay />;
  }

  // Only show lock display if wallet exists AND is locked
  const shouldShowLock = hasWallet && isLocked;

  return (
    <div
      className={cn(
        "bg-[var(--background-color)] size-full absolute inset-0 z-[50] transition-all duration-300 overflow-hidden",
        shouldShowLock ? "block" : "hidden"
      )}
    >
      <div className="flex flex-col h-full">
        <Header>
          <div className="text-lg text-center w-full">PURRO</div>
        </Header>
        <div className="flex-1 flex justify-center items-center p-4">
          <div className="w-full flex flex-col items-center gap-2">
            <img src={logo} className="w-24" />
            <h1 className="text-xl font-semibold">Enter your password</h1>
            <InputPassword
              value={password}
              onChange={onChangePassword}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUnlock();
                }
              }}
              hasError={hasError}
            />
            <p
              className="text-base cursor-pointer hover:underline text-gray-500"
              // onClick={() => openDialog(<ForgotPassword />)}
            >
              Forgot password?
            </p>
          </div>
        </div>
        <div className="p-4">
          <Button className="w-full" onClick={handleUnlock}>
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LockDisplay;
