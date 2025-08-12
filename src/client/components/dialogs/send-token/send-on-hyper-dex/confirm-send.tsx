import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from "@/client/components/ui";
import { DialogHeader } from "@/client/components/ui";
import { Menu } from "@/client/components/ui/menu";
import { sendMessage } from "@/client/utils/extension-message-utils";
import useDialogStore from "@/client/hooks/use-dialog-store";
import { ArrowLeft, Send, X } from "lucide-react";
import useSendTokenHLStore from "@/client/hooks/use-send-token-HL-store";
import { useEffect, useState } from "react";
import { getAddressByDomain } from "@/client/services/hyperliquid-name-api";
import { useHlPortfolioData } from "@/client/hooks/use-hyperliquid-portfolio";
import useDevModeStore from "@/client/hooks/use-dev-mode";

// Real gas estimation function using the app's RPC infrastructure

const ConfirmSend = () => {
  const { isDevMode } = useDevModeStore();
  const { setStep, recipient, amount, token } = useSendTokenHLStore();
  const { refetchSpot } = useHlPortfolioData();
  const { closeDialog } = useDialogStore();
  const [recipientAddress, setRecipientAddress] = useState<string>(recipient);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const handleConfirmSend = async () => {
    if (token && recipient && amount) {
      try {
        setIsLoading(true);
        console.log("🚀 Starting transaction send process...");

        // Send transaction through the Hyperliquid handler
        const result = await sendMessage("HYPERLIQUID_SEND_TOKEN", {
          destination: recipientAddress,
          amount,
          tokenName: token.tokenInfo?.name,
          tokenId: token.tokenInfo?.tokenId,
          isDevMode: isDevMode,
        });

        // Show success message
        const isSuccess = result.success;

        if (isSuccess) {
          refetchSpot();
          setStep("success");
        } else {
          alert(result.error);
        }
      } catch (error) {
        console.error("❌ Transaction failed:", error);

        let errorMessage = "Transaction failed. Please try again.";
        if (error instanceof Error) {
          if (error.message.includes("insufficient funds")) {
            errorMessage =
              "Insufficient funds for this transaction including gas fees.";
          } else if (error.message.includes("gas")) {
            errorMessage =
              "Gas estimation failed. The transaction may fail or gas price may have changed.";
          } else if (error.message.includes("nonce")) {
            errorMessage = "Transaction nonce error. Please try again.";
          } else if (error.message.includes("rejected")) {
            errorMessage = "Transaction was rejected.";
          } else {
            errorMessage = `Transaction failed: ${error.message}`;
          }
        }

        alert(`❌ ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBackFromConfirm = () => {
    setStep("send");
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Confirm Transaction"
        onClose={handleBackFromConfirm}
        icon={<ArrowLeft className="size-4 text-white" />}
        rightContent={
          <button
            onClick={closeDialog}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-4 text-white" />
          </button>
        }
      />
      <DialogContent>
        {token && (
          <div className="space-y-6">
            {/* Transaction Summary */}
            <div className="space-y-4">
              <Menu
                items={[
                  {
                    label: "Amount",
                    description: `${amount} ${token.coin}`,
                  },
                  {
                    label: "To",
                    isLongDescription: true,
                    description: `${recipientAddress}${
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

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ Please double-check all transaction details. This action
                cannot be undone.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleBackFromConfirm}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleConfirmSend}
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              Confirm Send
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ConfirmSend;
