import { useState } from "react";
import PrivateKeyWarning from "./private-key-warning";
import ExportPassword from "../export-password";
import PrivateKeyList from "./private-key-list";
import useWallet from "@/client/hooks/use-wallet";
import useEditAccountStore from "@/client/hooks/use-edit-account-store";
import PrivateKeyDisplay from "./private-key-display";
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from "@/client/components/ui";
import { ChainType } from "@/background/types/account";

const ShowPrivateKey = ({ onBack }: { onBack: () => void }) => {
  const [steps, setSteps] = useState<
    "list-keys" | "warning" | "password" | "show"
  >("warning");
  const [password, setPassword] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const { exportPrivateKey } = useWallet();
  const { selectedAccountId } = useEditAccountStore();

  if (!selectedAccountId) {
    return <div>No account selected</div>;
  }

  const handlePasswordConfirm = async (password: string) => {
    setPassword(password);
    setSteps("list-keys");
  };

  const handleChooseChain = async (chainStorageKey: string) => {
    setSteps("show");

    if (!chainStorageKey || !password) {
      return;
    }

    // Convert storageKey (e.g., "eip155") to ChainType if it matches
    const chain = chainStorageKey as ChainType;

    const privateKey = await exportPrivateKey(
      selectedAccountId,
      chain,
      password
    );

    setPrivateKey(privateKey);
  };

  return (
    <>
      {steps === "warning" && (
        <PrivateKeyWarning
          onBack={onBack}
          onConfirm={() => {
            setSteps("password");
          }}
        />
      )}
      {steps === "password" && (
        <ExportPassword
          onBack={onBack}
          description="Enter your password to export your private key."
          onConfirm={(password) => {
            handlePasswordConfirm(password);
          }}
        />
      )}
      {steps === "list-keys" && (
        <PrivateKeyList onBack={onBack} onChooseChain={handleChooseChain} />
      )}
      {steps === "show" && privateKey && (
        <DialogWrapper>
          <DialogHeader
            title="Your Private Key"
            onClose={() => {
              setSteps("list-keys");
            }}
          />
          <DialogContent>
            <PrivateKeyDisplay privateKey={privateKey} />
          </DialogContent>
          <DialogFooter>
            <Button onClick={onBack} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogWrapper>
      )}
    </>
  );
};

export default ShowPrivateKey;
