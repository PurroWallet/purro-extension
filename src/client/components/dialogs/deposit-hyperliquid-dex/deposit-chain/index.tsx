import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from "@/client/components/ui";
import { X } from "lucide-react";
import useDialogStore from "@/client/hooks/use-dialog-store";

const DepositChain = () => {
  const { closeDialog } = useDialogStore();
  return (
    <DialogWrapper>
      <DialogHeader
        title="Deposit USDC"
        onClose={closeDialog}
        icon={<X className="size-4" />}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p>Deposit USDC from Arbitrum</p>
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};

export default DepositChain;
