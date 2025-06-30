import { useState } from "react";
import SeedPhraseWarning from "./seed-phrase-warning";
import ExportPassword from "../export-password";
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from "@/client/component/ui";
import useWallet from "@/client/hooks/use-wallet";
import useEditAccountStore from "@/client/hooks/use-edit-account-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import SeedPhraseRender from "@/client/component/render/seed-phrase-render";

const ShowSeedPhrase = ({ onBack }: { onBack: () => void }) => {
  const [steps, setSteps] = useState<"password" | "warning" | "show">(
    "warning"
  );
  const [exportedSeedPhrase, setExportedSeedPhrase] = useState<string | null>(
    null
  );
  const { exportSeedPhrase } = useWallet();
  const { selectedAccountId } = useEditAccountStore();
  const { accounts } = useWalletStore();
  const account = accounts.find((account) => account.id === selectedAccountId);

  const handlePasswordConfirm = async (password: string) => {
    try {
      if (!account?.seedPhraseId) {
        throw new Error("Seed phrase not found");
      }
      const exportedSeedPhrase = await exportSeedPhrase(
        account.seedPhraseId,
        password
      );
      setExportedSeedPhrase(exportedSeedPhrase);
      setSteps("show");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      {steps === "warning" && (
        <SeedPhraseWarning
          onBack={onBack}
          onConfirm={() => {
            setSteps("password");
          }}
        />
      )}
      {steps === "password" && (
        <ExportPassword
          onBack={onBack}
          description="Enter your password to export your seed phrase."
          onConfirm={(password) => {
            handlePasswordConfirm(password);
          }}
        />
      )}
      {steps === "show" && (
        <DialogWrapper>
          <DialogHeader title="Recovery Phrase" onClose={onBack} />
          <DialogContent>
            {exportedSeedPhrase && (
              <SeedPhraseRender
                seedPhrase={exportedSeedPhrase}
                isCopyable={false}
              />
            )}
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

export default ShowSeedPhrase;
