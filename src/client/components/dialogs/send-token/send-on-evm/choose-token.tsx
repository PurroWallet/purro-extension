import { useUnifiedTokens } from "@/client/hooks/use-unified-tokens";
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from "@/client/components/ui";
import useDialogStore from "@/client/hooks/use-dialog-store";
import TokenList from "@/client/components/token-list";
import { X } from "lucide-react";
import { UnifiedToken } from "@/client/components/token-list";
import useSendTokenStore from "@/client/hooks/use-send-token-store";

const ChooseToken = () => {
  const { allUnifiedTokens } = useUnifiedTokens();
  const { closeDialog } = useDialogStore();
  const { setStep, setToken } = useSendTokenStore();

  const handleClick = (token: UnifiedToken) => {
    setToken(token);
    setStep("send");
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Send Token"
        onClose={closeDialog}
        icon={<X className="size-4" />}
      />
      <DialogContent>
        <TokenList
          tokens={allUnifiedTokens}
          onTokenClick={(token) => handleClick(token)}
        />
      </DialogContent>
      <DialogFooter>
        <Button onClick={closeDialog} variant="secondary" className="w-full">
          Cancel
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ChooseToken;
