import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
} from "@/client/components/ui";
import { DialogHeader } from "@/client/components/ui";
import useSendTokenStore from "@/client/hooks/use-send-token-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { sendMessage } from "@/client/utils/extension-message-utils";
import { convertToWeiHex } from "@/client/utils/formatters";
import { useEffect, useState } from "react";
import useDialogStore from "@/client/hooks/use-dialog-store";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  AlertTriangle,
  X,
  CircleAlert,
} from "lucide-react";
import { getNetworkIcon } from "@/utils/network-icons";
import { getAddressByDomain } from "@/client/services/hyperliquid-name-api";
import {
  NativeToken,
  useNativeBalance,
} from "@/client/hooks/use-native-balance";
import { getTokenLogo } from "@/client/utils/icons";

type GasEstimate = {
  gasLimit: string;
  gasPrice: string;
  gasCostEth: string;
  gasCostUsd: string;
  totalCostUsd: string;
};

// Helper function to get chain ID from chain name
const getChainId = (chain: string): string => {
  switch (chain) {
    case "ethereum":
      return "0x1";
    case "base":
      return "0x2105";
    case "arbitrum":
      return "0xa4b1";
    case "hyperevm":
      return "0x3e7";
    default:
      return "0x1";
  }
};

// Helper function to get explorer URL for transaction
const getExplorerUrl = (chain: string, txHash: string): string => {
  if (txHash === "Processing..." || !txHash) return "";

  switch (chain) {
    case "ethereum":
      return `https://etherscan.io/tx/${txHash}`;
    case "base":
      return `https://basescan.org/tx/${txHash}`;
    case "arbitrum":
      return `https://arbiscan.io/tx/${txHash}`;
    case "hyperevm":
      return `https://purrsec.com/tx/${txHash}`;
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
};

// Real gas estimation function using the app's RPC infrastructure
const estimateGas = async (
  token: any,
  amount: string,
  recipient: string,
  senderAddress: string,
  nativeTokens: NativeToken[]
) => {
  try {
    console.log("🔍 Estimating gas for transaction:", {
      token: token.symbol,
      amount,
      recipient,
      senderAddress,
      chain: token.chain,
    });

    // Prepare transaction object
    let txObject: any;
    if (
      token.symbol === "ETH" ||
      token.symbol === "HYPE" ||
      token.contractAddress === "native" ||
      token.contractAddress === "NATIVE"
    ) {
      // Native token transfer (ETH, HYPE)
      txObject = {
        from: senderAddress,
        to: recipient,
        value: convertToWeiHex(amount), // Convert to wei hex
      };
    } else {
      // ERC-20 token transfer
      const transferMethodId = "0xa9059cbb";
      const paddedRecipient = recipient.slice(2).padStart(64, "0");
      const paddedAmount = Math.floor(
        parseFloat(amount) * Math.pow(10, token.decimals || 18)
      )
        .toString(16)
        .padStart(64, "0");
      txObject = {
        from: senderAddress,
        to: token.contractAddress,
        data: transferMethodId + paddedRecipient + paddedAmount,
      };
    }

    console.log("📝 Transaction object:", txObject, getChainId(token.chain));

    // Get gas estimate
    const gasEstimateResponse = await sendMessage("EVM_ESTIMATE_GAS", {
      transaction: txObject,
      chainId: getChainId(token.chain),
    });

    console.log("⛽ Gas estimation response:", gasEstimateResponse);

    const gasLimit = parseInt(gasEstimateResponse.data.gas, 16);

    // Handle both legacy and EIP-1559 transactions
    let effectiveGasPrice: number;
    let gasPriceGwei: number;

    if (gasEstimateResponse.data.gasPrice) {
      // Legacy transaction (type 0x0)
      effectiveGasPrice = parseInt(gasEstimateResponse.data.gasPrice, 16);
      gasPriceGwei = Math.round(effectiveGasPrice / 1e9);
      console.log("📊 Using legacy gas pricing");
    } else if (gasEstimateResponse.data.maxFeePerGas) {
      // EIP-1559 transaction (type 0x2)
      effectiveGasPrice = parseInt(gasEstimateResponse.data.maxFeePerGas, 16);
      gasPriceGwei = Math.round(effectiveGasPrice / 1e9);
      console.log("📊 Using EIP-1559 gas pricing");

      // Log additional EIP-1559 info if available
      if (gasEstimateResponse.data.maxPriorityFeePerGas) {
        const priorityFeeGwei = Math.round(
          parseInt(gasEstimateResponse.data.maxPriorityFeePerGas, 16) / 1e9
        );
        console.log(`💡 Priority fee: ${priorityFeeGwei} Gwei`);
      }
    } else {
      // Fallback if neither is available
      console.warn("⚠️ No gas price data in response, using fallback");
      effectiveGasPrice = 20e9; // 20 Gwei fallback
      gasPriceGwei = 20;
    }

    // Calculate gas cost in ETH
    const gasCostWei = gasLimit * effectiveGasPrice;
    const gasCostEth = gasCostWei / 1e18;

    let nativeTokenPrice = 3000; // Default fallback

    const nativeToken = nativeTokens.find(
      (t: NativeToken) => t.chain === token.chain
    );
    nativeTokenPrice = nativeToken?.usdPrice || 3000;

    const gasCostUsd = gasCostEth * nativeTokenPrice;
    const tokenTotalCostUsd = parseFloat(amount) * (token.usdPrice || 0);
    const totalCostUsd = tokenTotalCostUsd + gasCostUsd;

    console.log("✅ Gas estimation successful:", {
      gasLimit,
      effectiveGasPrice,
      gasPriceGwei,
      gasCostEth,
      gasCostUsd,
      totalCostUsd,
    });

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPriceGwei.toString(), // Always return in Gwei
      gasCostEth: gasCostEth.toFixed(8),
      gasCostUsd: gasCostUsd.toFixed(6),
      totalCostUsd: totalCostUsd.toFixed(6),
      // Optional: include transaction type info
      transactionType: gasEstimateResponse.data.type || "unknown",
      isEIP1559: !!gasEstimateResponse.data.maxFeePerGas,
    };
  } catch (error) {
    console.error("❌ Gas estimation failed:", error);

    // Fallback to estimated values if RPC fails
    const fallbackGasLimit = token.symbol === "ETH" ? "21000" : "65000";
    const fallbackGasPrice = "20"; // 20 gwei
    const fallbackGasCostEth =
      (parseInt(fallbackGasLimit) * parseInt(fallbackGasPrice)) / 1e9;
    const fallbackGasCostUsd = fallbackGasCostEth * 3000;

    console.warn("⚠️ Using fallback gas estimation");
    const tokenTotalCostUsd = parseFloat(amount) * (token.usdPrice || 0);
    console.log("🔍 Token total cost USD:", tokenTotalCostUsd);
    return {
      gasLimit: fallbackGasLimit,
      gasPrice: fallbackGasPrice,
      gasCostEth: fallbackGasCostEth.toFixed(8),
      gasCostUsd: fallbackGasCostUsd.toFixed(6),
      totalCostUsd: (tokenTotalCostUsd + fallbackGasCostUsd).toFixed(6),
      transactionType: "fallback",
      isEIP1559: false,
    };
  }
};

const ConfirmSend = () => {
  const { setStep, recipient, amount, token } = useSendTokenStore();
  const { closeDialog } = useDialogStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(true);
  const [addressDomain, setAddressDomain] = useState<string | null>(null);
  const { nativeTokens } = useNativeBalance();
  const [isHaveEnoughGasFee, setIsHaveEnoughGasFee] = useState(true);

  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;
  const isHLName = recipient.match(/^[a-zA-Z0-9]+\.hl$/);
  const tokenLogoSrc = token?.icon_url || getTokenLogo(token?.symbol || "");

  useEffect(() => {
    const checkDomain = async () => {
      const domain = await getAddressByDomain(recipient);
      setAddressDomain(domain);
    };

    if (recipient && isHLName) {
      checkDomain();
    }
  }, [recipient]);

  useEffect(() => {
    const performGasEstimation = async () => {
      if (token && amount && recipient && activeAccountAddress) {
        setIsEstimatingGas(true);
        if (isHLName && !addressDomain) {
          setIsEstimatingGas(false);
          return;
        }

        try {
          const estimate = await estimateGas(
            token,
            amount,
            addressDomain || recipient,
            activeAccountAddress,
            nativeTokens
          );
          setGasEstimate(estimate);
        } catch (error) {
          console.error("Failed to estimate gas:", error);
        } finally {
          setIsEstimatingGas(false);
        }
      }
    };

    performGasEstimation();
  }, [token, amount, recipient, activeAccountAddress, addressDomain]);

  useEffect(() => {
    if (gasEstimate && token) {
      const nativeToken = nativeTokens.find(
        (t: NativeToken) => t.chain === token.chain
      );

      const gasCostEth = parseFloat(gasEstimate.gasCostEth);
      const nativeTokenBalance = parseFloat(nativeToken?.balance || "0");

      setIsHaveEnoughGasFee(gasCostEth <= nativeTokenBalance * 0.9);
    }
  }, [gasEstimate, token]);

  const handleConfirmSend = async () => {
    if (token && recipient && amount && gasEstimate && activeAccountAddress) {
      setIsEstimatingGas(true);

      try {
        console.log("🚀 Starting transaction send process...");

        // Validate domain resolution for HL names
        if (isHLName && !addressDomain) {
          throw new Error("Failed to resolve HyperLiquid domain name");
        }

        const finalRecipient = addressDomain || recipient;
        console.log("📍 Final recipient:", finalRecipient);

        // Build the transaction object
        let transactionData: any;

        if (
          token.symbol === "ETH" ||
          token.symbol === "HYPE" ||
          token.contractAddress === "native" ||
          token.contractAddress === "NATIVE"
        ) {
          // Native token transfer (ETH, HYPE)
          // Use BigInt to avoid precision issues
          const valueInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

          transactionData = {
            type: "eth_sendTransaction",
            to: finalRecipient,
            value: `0x${valueInWei.toString(16)}`,
            gas: `0x${parseInt(gasEstimate.gasLimit).toString(16)}`,
            gasPrice: `0x${Math.floor(
              parseInt(gasEstimate.gasPrice) * 1e9
            ).toString(16)}`, // Convert gwei to wei
            chainId: getChainId(token.chain),
          };
        } else {
          // ERC-20 token transfer
          const transferMethodId = "0xa9059cbb";

          // FIXED: Use finalRecipient instead of recipient
          const paddedRecipient = finalRecipient.slice(2).padStart(64, "0");

          // Use BigInt for amount calculation to avoid precision issues
          const tokenDecimals = token.decimals || 18;
          const amountInTokenUnits = BigInt(
            Math.floor(parseFloat(amount) * Math.pow(10, tokenDecimals))
          );
          const paddedAmount = amountInTokenUnits
            .toString(16)
            .padStart(64, "0");

          transactionData = {
            type: "eth_sendTransaction",
            to: token.contractAddress,
            value: "0x0", // No ETH value for ERC-20 transfers
            data: transferMethodId + paddedRecipient + paddedAmount,
            gas: `0x${parseInt(gasEstimate.gasLimit).toString(16)}`,
            gasPrice: `0x${Math.floor(
              parseInt(gasEstimate.gasPrice) * 1e9
            ).toString(16)}`, // Convert gwei to wei
            chainId: getChainId(token.chain),
          };
        }

        console.log("📝 Transaction data prepared:", transactionData);

        // Send transaction through the EVM handler
        const result = await sendMessage("EVM_SEND_TRANSACTION", {
          transaction: transactionData,
        });

        console.log("✅ Transaction sent successfully:", result);

        // Show success message
        const txHash = result.transactionHash || "Processing...";
        const explorerUrl = getExplorerUrl(token.chain, txHash);

        alert(
          `🎉 Transaction sent successfully!\n\n` +
            `Sent: ${amount} ${token.symbol}\n` +
            `To: ${finalRecipient.slice(0, 6)}...${finalRecipient.slice(
              -4
            )}\n` +
            `Gas Fee: ${gasEstimate.gasCostEth} ETH (≈$${gasEstimate.gasCostUsd})\n\n` +
            `Transaction Hash: ${txHash}\n\n` +
            `Your transaction is being processed on the ${token.chain} network.\n` +
            (explorerUrl ? `\nView on Explorer: ${explorerUrl}` : "")
        );

        closeDialog();
      } catch (error) {
        console.error("❌ Transaction failed:", error);

        let errorMessage = "Transaction failed. Please try again.";
        if (error instanceof Error) {
          if (error.message.includes("Failed to resolve")) {
            errorMessage =
              "Failed to resolve HyperLiquid domain name. Please check the address.";
          } else if (error.message.includes("insufficient funds")) {
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
        setIsEstimatingGas(false);
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
                      {tokenLogoSrc ? (
                        <img
                          src={tokenLogoSrc}
                          alt={token.symbol}
                          className="size-6 rounded-full object-cover p-1"
                        />
                      ) : (
                        <p className="text-white text-xs font-bold">
                          {token.symbol.charAt(0).toUpperCase()}
                        </p>
                      )}
                    </div>
                    <span className="text-white font-medium">
                      {token.symbol}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount</span>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {amount} {token.symbol}
                    </div>
                    <div className="text-gray-400 text-sm">
                      ≈ $
                      {(
                        (parseFloat(amount) || 0) * (token.usdPrice || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">To</span>
                  <span className="text-white font-mono text-sm">
                    {addressDomain
                      ? addressDomain.slice(0, 6) +
                        "..." +
                        addressDomain.slice(-4)
                      : recipient.slice(0, 6) +
                        "..." +
                        recipient.slice(-4)}{" "}
                    {isHLName && `(${recipient})`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Network</span>
                  <div className="flex items-center">
                    <img
                      src={getNetworkIcon(token.chain)}
                      alt={token.chain}
                      className="size-5 rounded-full mr-2"
                    />
                    <span className="text-white capitalize">{token.chain}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gas Fee Details */}
            {isEstimatingGas ? (
              <div className="bg-[var(--card-color)] rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                  <span className="text-white">Estimating gas fees...</span>
                </div>
              </div>
            ) : gasEstimate ? (
              <div
                className={` rounded-lg p-4 border ${
                  !isHaveEnoughGasFee
                    ? "border-red-500/20 bg-red-500/10"
                    : "border-white/10 bg-[var(--card-color)]"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 flex items-center ${
                    !isHaveEnoughGasFee ? "text-red-500" : "text-white"
                  }`}
                >
                  <AlertTriangle
                    className={`size-5 mr-2 ${
                      !isHaveEnoughGasFee ? "text-red-500" : "text-yellow-500"
                    }`}
                  />
                  Gas Fee Estimation
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Gas Limit</span>
                    <span className="text-white">{gasEstimate.gasLimit}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Gas Price</span>
                    <span className="text-white">
                      {gasEstimate.gasPrice} gwei
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Gas Fee</span>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {gasEstimate.gasCostEth}{" "}
                        {token.chain === "hyperevm" ? "HYPE" : "ETH"}
                      </div>
                      <div className="text-gray-400 text-sm">
                        ≈ ${gasEstimate.gasCostUsd}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-medium">
                        Total Cost
                      </span>
                      <div className="text-right">
                        <div className="text-white font-semibold text-lg">
                          ${gasEstimate.totalCostUsd}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Token + Gas Fee
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  ⚠️ Failed to estimate gas fees. Please try again.
                </p>
              </div>
            )}

            {!isHaveEnoughGasFee ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm flex items-center text-nowrap">
                  <CircleAlert className="size-4 mr-2" />
                  Don't have enough gas fee. Available:{" "}
                  {parseFloat(
                    nativeTokens.find(
                      (t: NativeToken) => t.chain === token.chain
                    )?.balance || "0"
                  ).toFixed(2)}{" "}
                  {token.chain === "hyperevm" ? " HYPE" : " ETH"}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Please double-check all transaction details. This action
                  cannot be undone.
                </p>
              </div>
            )}
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
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={isEstimatingGas || !gasEstimate || !isHaveEnoughGasFee}
        >
          {isEstimatingGas ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              Confirm
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ConfirmSend;
