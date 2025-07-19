import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from "@/client/components/ui";
import { DialogHeader } from "@/client/components/ui";
import useSendTokenStore from "@/client/hooks/use-send-token-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { calculateGasFeeInETH } from "@/client/lib/utils";
import { sendMessage } from "@/client/utils/extension-message-utils";
import {
  convertToWeiHex,
  formatCurrency,
  hexToNumber,
} from "@/client/utils/formatters";
import { useEffect, useState } from "react";

// Helper function to send messages to extension

const ConfirmSend = () => {
  const { setStep, recipient, amount, token } = useSendTokenStore();
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccountWalletObject = getActiveAccountWalletObject();
  const [estimatedGas, setEstimatedGas] = useState<any>(0);

  useEffect(() => {
    const getGasPrice = async () => {
      setIsLoading(true);
      const gasPriceResponse = await sendMessage("EVM_GET_GAS_PRICE");
      console.log("💰 Gas price response:", gasPriceResponse);
      const gasPriceWei = hexToNumber(gasPriceResponse.gasPrice);
      const gasPriceGwei = gasPriceWei / 1e9; // Convert from wei to gwei

      if (token?.isNative) {
        const txObject = {
          from:
            activeAccountWalletObject?.eip155?.address ||
            activeAccountWalletObject?.sui?.address ||
            "",
          to: recipient,
          value: convertToWeiHex(amount),
        };

        const gasEstimateResponse = await sendMessage("EVM_ESTIMATE_GAS", {
          txObject,
        });

        const gas = hexToNumber(gasEstimateResponse.gasEstimate);

        const gasFee = calculateGasFeeInETH(gas, gasPriceGwei);
        setEstimatedGas(gasFee);
        setIsLoading(false);
      } else {
      }
    };
    getGasPrice();
  }, []);

  const handleSendNativeToken = async () => {};

  const handleSendErc20Token = async () => {};

  const handleSend = async () => {
    setIsSending(true);
    if (!token) return;

    try {
      if (token?.isNative) {
        await handleSendNativeToken();
      } else {
        await handleSendErc20Token();
      }
    } catch (error) {
      console.error("Transaction error:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader title="Confirm Send" onClose={() => setStep("send")} />
      <DialogContent>
        <div className="bg-[var(--card-color)] rounded-lg w-full">
          <div className="flex items-center gap-3 pl-4 w-full border-b border-white/10">
            <div className="flex-grow py-4 pr-4">
              <p className="text-base font-medium w-full text-left">
                Recipient Address
              </p>
              <p className="text-base text-gray-400 text-left break-all w-full">
                {recipient}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-4 w-full border-b border-white/10">
            <div className="flex-grow flex items-center gap-3 py-4 pr-4">
              <p className="text-base font-medium w-fit text-left">Amount</p>
              <p className="text-base text-gray-400 text-right flex-1">
                {formatCurrency(Number(amount), 4, "")} {token?.symbol}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-4 w-full border-b border-white/10">
            <div className="flex-grow flex items-center gap-3 py-4 pr-4">
              <p className="text-base font-medium w-fit text-left">Network</p>
              <p className="text-base text-gray-400 text-right flex-1">
                {token?.chainName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-4 w-full">
            <div className="flex-grow flex items-center gap-3 py-4 pr-4">
              <p className="text-base font-medium w-fit text-left">
                Estimated Gas
              </p>
              <p className="text-base text-gray-400 text-right flex-1">
                {isLoading
                  ? "Calculating..."
                  : `~ ${estimatedGas.toFixed(10)} ${
                      token?.chain === "hyperevm" ? "HYPE" : "ETH"
                    }`}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter className="flex-col">
        <p className="text-sm text-gray-300 text-center">
          Please make sure information is correct before sending. Blockchain
          transaction cannot be reversed.
        </p>
        <Button
          className="w-full"
          disabled={
            !token || !recipient || !amount || Number(amount) <= 0 || isLoading
          }
        >
          Send
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ConfirmSend;
