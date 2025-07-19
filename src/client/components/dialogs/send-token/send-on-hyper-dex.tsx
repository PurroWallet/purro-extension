import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from "@/client/components/ui";
import useDialogStore from "@/client/hooks/use-dialog-store";

export const SendOnHyperDex = () => {
  const { closeDialog } = useDialogStore();
  return (
    <DialogWrapper>
      <DialogHeader
        title="Send on Hyperliquid DEX"
        onClose={() => {
          closeDialog();
        }}
      />
      <DialogContent>
        <div>SendOnHyperDex</div>
      </DialogContent>
    </DialogWrapper>
  );
};
