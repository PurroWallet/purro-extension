import useEditAccountStore from "@/client/hooks/use-edit-account-store";
import useWallet from "@/client/hooks/use-wallet";
import { useEffect, useState } from "react";
import { Button } from "../../ui";
import { DialogFooter } from "../../ui/dialog";
import { Input } from "../../ui";
import { DialogHeader } from "../../ui/dialog";
import { DialogContent } from "../../ui/dialog";
import { DialogWrapper } from "../../ui";
import useWalletStore from "@/client/hooks/use-wallet-store";

const EditName = ({ onBack }: { onBack: () => void }) => {
  const { accounts } = useWalletStore();
  const { selectedAccountId } = useEditAccountStore();
  const { changeAccountName } = useWallet();
  const [name, setName] = useState("");

  const account = accounts.find((account) => account.id === selectedAccountId);

  useEffect(() => {
    setName(account?.name || "");
  }, [account]);

  const handleNameChange = (name: string) => {
    setName(name);
  };

  const handleSave = () => {
    if (!selectedAccountId) return;
    changeAccountName(selectedAccountId, name);
    onBack();
  };

  return (
    <DialogWrapper>
      <DialogHeader title="Edit Name" onClose={onBack} />
      <DialogContent>
        <Input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            }
          }}
        />
      </DialogContent>

      <DialogFooter>
        <Button
          onClick={handleSave}
          disabled={!name || name === account?.name}
          className={`w-full ${!name ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Save
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default EditName;
