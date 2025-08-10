import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from "@/client/components/ui";
import { DialogHeader } from "@/client/components/ui";
import useSendTokenHLStore from "@/client/hooks/use-send-token-HL-store";
import useDialogStore from "@/client/hooks/use-dialog-store";
import { CheckCircle, Send, X } from "lucide-react";
import { getNetworkIcon } from "@/utils/network-icons";
import { getSpotTokenImage } from "@/client/utils/icons";
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
        <div className="flex flex-col items-center space-y-6">
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
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse"></div>
              <CheckCircle className="size-16 text-green-500 relative z-10" />
            </div>
          </motion.div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">
              Transaction Sent!
            </h2>
            <p className="text-gray-400 text-sm">
              Your transaction has been successfully submitted to the Hyperliquid network.
            </p>
          </div>

          {/* Transaction Details */}
          <div className="w-full bg-[var(--card-color)] rounded-lg p-4 border border-white/10 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Transaction Details
            </h3>

            <div className="space-y-3">
              {/* Amount and Token */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Amount</span>
                <div className="text-right">
                  <div className="flex items-center justify-end">
                    <img
                      src={getSpotTokenImage(token.coin)}
                      alt={token.coin}
                      className="size-5 rounded-full mr-2"
                    />
                    <span className="text-white font-medium">
                      {amount} {token.coin}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    ≈ $
                    {(
                      (parseFloat(amount) || 0) * (token.currentPrice || 0)
                    ).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Recipient */}
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

              {/* Network */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Network</span>
                <div className="flex items-center">
                  <img
                    src={getNetworkIcon("hyperliquid")}
                    alt="Hyperliquid"
                    className="size-5 rounded-full mr-2"
                  />
                  <span className="text-white">Hyperliquid DEX</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 w-full">
            <p className="text-blue-400 text-sm text-center">
              💡 Your transaction is being processed. It may take a few moments to appear in your transaction history.
            </p>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleSendAnother}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
        >
          <Send className="size-4 mr-2" />
          Send Another
        </Button>
        <Button
          onClick={handleDone}
          className="flex-1"
        >
          <CheckCircle className="size-4 mr-2" />
          Done
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default TransactionSuccess;
