import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from "@/client/components/ui";
import { DialogHeader } from "@/client/components/ui";
import { sendMessage } from "@/client/utils/extension-message-utils";
import useDialogStore from "@/client/hooks/use-dialog-store";
import { ArrowLeft, Send, CheckCircle, X } from "lucide-react";
import { getNetworkIcon } from "@/utils/network-icons";
import useSendTokenHLStore from "@/client/hooks/use-send-token-HL-store";
import { useEffect, useState } from "react";
import { getAddressByDomain } from "@/client/services/hyperliquid-name-api";
import { getSpotTokenImage } from "@/client/utils/icons";
import { useHlPortfolioData } from "@/client/hooks/use-hyperliquid-portfolio";

// Real gas estimation function using the app's RPC infrastructure

const ConfirmSend = () => {
  const {
    setStep,
    recipient,
    amount,
    token,
    setRecipient,
    setAmount,
    setToken,
  } = useSendTokenHLStore();
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
        });

        console.log("result", result);

        // Show success message
        const isSuccess = result.success;

        if (isSuccess) {
          setRecipient("");
          setAmount("");
          setToken(null);
          refetchSpot();
          closeDialog();
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
            <div className="bg-[var(--card-color)] rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CheckCircle className="size-5 mr-2 text-green-500" />
                Transaction Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Token</span>
                  <div className="flex items-center">
                    <div className="flex items-center justify-center size-6 bg-[var(--card-color)] rounded-full mr-2">
                      <img
                        src={getSpotTokenImage(token.coin)}
                        alt={token.coin}
                        className="size-full rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallbackDiv = document.createElement("div");
                            fallbackDiv.className =
                              "size-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-lg border border-[var(--primary-color)]/20";
                            fallbackDiv.textContent = token.coin
                              .charAt(0)
                              .toUpperCase();
                            parent.insertBefore(fallbackDiv, e.currentTarget);
                          }
                        }}
                      />
                    </div>
                    <span className="text-white font-medium">{token.coin}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount</span>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {amount} {token.coin}
                    </div>
                    <div className="text-gray-400 text-sm">
                      ≈ $
                      {(
                        (parseFloat(amount) || 0) * (token.currentPrice || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">To</span>
                  <span className="text-white font-mono text-sm">
                    {recipientAddress.slice(0, 6)}...
                    {recipientAddress.slice(-4)}{" "}
                    {recipient.endsWith(".hl") && (
                      <span className="text-gray-400 text-xs">
                        ({recipient})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Network</span>
                  <div className="flex items-center">
                    <img
                      src={getNetworkIcon("hyperliquid")}
                      alt="Hyperliquid"
                      className="size-5 rounded-full mr-2"
                    />
                    <span className="text-white capitalize">
                      Hyperliquid DEX
                    </span>
                  </div>
                </div>
              </div>
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
          className="flex-1 bg-gray-600 hover:bg-gray-700"
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
