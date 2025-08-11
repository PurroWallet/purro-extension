import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from "@/client/components/ui";
import { DialogHeader } from "@/client/components/ui";
import { Menu } from "@/client/components/ui/menu";
import useSendTokenHLStore from "@/client/hooks/use-send-token-HL-store";
import useDialogStore from "@/client/hooks/use-dialog-store";
import { Check, CheckCircle, Send, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { getAddressByDomain } from "@/client/services/hyperliquid-name-api";

const TransactionSuccess = () => {
  const {
    token,
    amount,
    recipient,
    setStep,
    setRecipient,
    setAmount,
    setToken,
  } = useSendTokenHLStore();
  const { closeDialog } = useDialogStore();

  const [recipientAddress, setRecipientAddress] = useState<string>(recipient);

  useEffect(() => {
    const resolveRecipientAddress = async () => {
      if (recipient.startsWith("0x")) {
        setRecipientAddress(recipient);
        return;
      }

      if (recipient.match(/^[a-zA-Z0-9-]+\.hl$/)) {
        try {
          const address = await getAddressByDomain(recipient);
          if (address) {
            setRecipientAddress(address);
            return;
          }
        } catch (error) {
          console.error("Failed to resolve domain:", error);
        }
      }

      setRecipientAddress(recipient);
    };

    resolveRecipientAddress();
  }, [recipient]);

  const handleDone = () => {
    // Clear the form data
    setRecipient("");
    setAmount("");
    setToken(null);
    setStep("select");
    closeDialog();
  };

  const handleSendAnother = () => {
    // Keep the token selected but clear amount and recipient
    setRecipient("");
    setAmount("");
    setStep("send");
  };

  if (!token) {
    return null;
  }

  return (
    <DialogWrapper>
      <DialogHeader
        title="Transaction Successful"
        onClose={handleDone}
        icon={<X className="size-4" />}
      />
      <DialogContent>
        <div className="flex flex-col items-center space-y-4">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="flex items-center justify-center"
          >
            <CheckCircle className="size-16 text-[var(--primary-color-light)] relative z-10" />
          </motion.div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Transaction Sent!</h2>
            <p className="text-gray-400 text-sm">
              Your transaction has been successfully submitted to the
              Hyperliquid network.
            </p>
          </div>

          {/* Transaction Details using Menu component */}
          <div className="w-full">
            <Menu
              items={[
                {
                  label: "Amount",
                  description: `${amount} ${token.coin}`,
                },
                {
                  label: "To",
                  description: `${recipientAddress.slice(
                    0,
                    6
                  )}...${recipientAddress.slice(-4)}${
                    recipient.endsWith(".hl") ? ` (${recipient})` : ""
                  }`,
                },
                {
                  label: "Network",
                  description: "Hyperliquid DEX",
                },
              ]}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleSendAnother}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          <Send className="size-4" />
          Send Another
        </Button>
        <Button onClick={handleDone} className="flex-1">
          <Check className="size-4" />
          Done
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default TransactionSuccess;
