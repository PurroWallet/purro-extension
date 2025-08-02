import TokenList from "@/client/components/token-list";
import {
  Button,
  DialogContent,
  DialogFooter,
  Input,
} from "@/client/components/ui";
import { DialogHeader, DialogWrapper } from "@/client/components/ui";
import useDialogStore from "@/client/hooks/use-dialog-store";
import { useUnifiedTokens } from "@/client/hooks/use-unified-tokens";
import { UnifiedToken } from "@/client/components/token-list";
import { useState, useMemo } from "react";
import { convertToWeiHex, formatCurrency } from "@/client/utils/formatters";
import {
  ArrowLeft,
  Send,
  DollarSign,
  Coins,
  CheckCircle,
  AlertTriangle,
  X,
  CircleAlert,
  CircleCheck,
} from "lucide-react";
import { getNetworkIcon } from "@/utils/network-icons";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { sendMessage } from "@/client/utils/extension-message-utils";
import useDebounce from "@/client/hooks/use-debounce";
import { getAddressByDomain } from "@/client/services/hyperliquid-name-api";
import { useEffect } from "react";

type InputMode = "token" | "usd";
type Step = "select" | "send" | "confirm";

// Helper function to get chain ID from chain name
const getChainId = (chain: string): number => {
  switch (chain) {
    case "ethereum":
      return 1;
    case "base":
      return 8453;
    case "arbitrum":
      return 42161;
    case "hyperevm":
      return 999;
    default:
      return 1;
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
    case "hyperliquid":
      return `https://hyperscan.com/tx/${txHash}`;
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
};

// Real gas estimation function using the app's RPC infrastructure
const estimateGas = async (
  token: UnifiedToken,
  amount: string,
  recipient: string,
  senderAddress: string
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
      // ERC-20 transfer function signature: transfer(address,uint256)
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

    console.log("📝 Transaction object:", txObject);

    // Get gas estimate
    const gasEstimateResponse = await sendMessage("EVM_ESTIMATE_GAS", {
      txObject,
    });

    // Get current gas price
    const gasPriceResponse = await sendMessage("EVM_GET_GAS_PRICE");

    console.log("⛽ Gas estimation response:", gasEstimateResponse);
    console.log("💰 Gas price response:", gasPriceResponse);

    const gasLimit = parseInt(gasEstimateResponse.gasEstimate, 16);
    const gasPrice = parseInt(gasPriceResponse.gasPrice, 16);

    // Calculate gas cost in ETH
    const gasCostWei = gasLimit * gasPrice;
    const gasCostEth = gasCostWei / 1e18;

    // Estimate native token price for gas cost calculation
    let nativeTokenPrice = 3000; // Default fallback

    if (token.chain === "hyperevm") {
      // For Hyperliquid, gas is paid in HYPE, so we need HYPE price
      // You might want to get this from your token price API
      nativeTokenPrice = token.symbol === "HYPE" ? token.usdPrice || 30 : 30; // HYPE price fallback
    } else {
      // For other EVM chains, gas is paid in ETH
      nativeTokenPrice =
        token.chain === "ethereum" ? token.usdPrice || 3000 : 3000;
    }

    const gasCostUsd = gasCostEth * nativeTokenPrice;
    const totalCostUsd = parseFloat(amount) + gasCostUsd;

    console.log("✅ Gas estimation successful:", {
      gasLimit,
      gasPrice,
      gasCostEth,
      gasCostUsd,
      totalCostUsd,
    });

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: Math.round(gasPrice / 1e9).toString(), // Convert to gwei
      gasCostEth: gasCostEth.toFixed(6),
      gasCostUsd: gasCostUsd.toFixed(2),
      totalCostUsd: totalCostUsd.toFixed(2),
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

    return {
      gasLimit: fallbackGasLimit,
      gasPrice: fallbackGasPrice,
      gasCostEth: fallbackGasCostEth.toFixed(6),
      gasCostUsd: fallbackGasCostUsd.toFixed(2),
      totalCostUsd: (parseFloat(amount) + fallbackGasCostUsd).toFixed(2),
    };
  }
};

// Helper function to format numbers for display
const formatDisplayNumber = (
  value: string | number,
  mode: InputMode
): string => {
  if (!value || value === "0") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  if (mode === "usd") {
    // For USD, show up to 2 decimal places, remove trailing zeros
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } else {
    // For tokens, show appropriate decimal places based on value size
    if (num >= 1000) {
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } else if (num >= 1) {
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      });
    } else {
      // For small numbers, show more precision but remove trailing zeros
      const formatted = num.toFixed(8);
      return parseFloat(formatted).toString();
    }
  }
};

// Helper function to format conversion display
const formatConversionNumber = (
  value: string | number,
  mode: InputMode
): string => {
  if (!value || value === "0") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  if (mode === "usd") {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    if (num >= 1) {
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      });
    } else {
      const formatted = num.toFixed(8);
      return parseFloat(formatted).toString();
    }
  }
};

export const SendOnEVM = () => {
  const { closeDialog } = useDialogStore();
  const { activeAccount, getActiveAccountWalletObject } = useWalletStore();
  const [selectedToken, setSelectedToken] = useState<UnifiedToken | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("token");
  const [gasEstimate, setGasEstimate] = useState<any>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [isValidDomain, setIsValidDomain] = useState<boolean>(false);
  const debouncedRecipientAddress = useDebounce(recipientAddress, 500);
  const [addressFromDomain, setAddressFromDomain] = useState<string | null>(
    null
  );

  const activeAccountId = activeAccount?.id;
  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Get all tokens from the hook
  const { allUnifiedTokens, isLoading, hasError } = useUnifiedTokens();

  // Filter only EVM tokens (include all EVM chains)
  const evmTokens = allUnifiedTokens.filter(
    (token) =>
      token.chain === "ethereum" ||
      token.chain === "base" ||
      token.chain === "arbitrum" ||
      token.chain === "hyperevm"
  );

  // Calculate converted amounts
  const { tokenAmount, usdAmount, isValidAmount, conversionAmount } =
    useMemo(() => {
      if (!selectedToken || !amount || isNaN(parseFloat(amount))) {
        return {
          tokenAmount: "",
          usdAmount: "",
          isValidAmount: false,
          displayAmount: "0",
          conversionAmount: "0",
        };
      }

      const numAmount = parseFloat(amount);
      const tokenPrice = selectedToken.usdPrice || 0;

      if (inputMode === "token") {
        const usdVal =
          tokenPrice > 0 ? (numAmount * tokenPrice).toFixed(2) : "0";
        return {
          tokenAmount: amount,
          usdAmount: usdVal,
          isValidAmount:
            numAmount > 0 && numAmount <= selectedToken.balanceFormatted,
          displayAmount: formatDisplayNumber(amount, "token"),
          conversionAmount: formatConversionNumber(usdVal, "usd"),
        };
      } else {
        const tokenVal =
          tokenPrice > 0 ? (numAmount / tokenPrice).toFixed(8) : "0";
        return {
          tokenAmount: tokenVal,
          usdAmount: amount,
          isValidAmount:
            numAmount > 0 && numAmount <= (selectedToken.usdValue || 0),
          displayAmount: formatDisplayNumber(amount, "usd"),
          conversionAmount: formatConversionNumber(tokenVal, "token"),
        };
      }
    }, [amount, inputMode, selectedToken]);

  const handleTokenSelect = (token: UnifiedToken) => {
    setSelectedToken(token);
    setStep("send");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedToken(null);
    setRecipientAddress("");
    setAmount("");
    setInputMode("token");
  };

  const handleMaxClick = () => {
    if (!selectedToken) return;

    if (inputMode === "token") {
      setAmount(selectedToken.balanceFormatted.toString());
    } else {
      setAmount((selectedToken.usdValue || 0).toFixed(2));
    }
  };

  const toggleInputMode = () => {
    if (!selectedToken || !amount) {
      setInputMode(inputMode === "token" ? "usd" : "token");
      return;
    }

    // Convert current amount to the other mode
    const numAmount = parseFloat(amount);
    const tokenPrice = selectedToken.usdPrice || 0;

    if (inputMode === "token" && tokenPrice > 0) {
      setAmount((numAmount * tokenPrice).toFixed(2));
      setInputMode("usd");
    } else if (inputMode === "usd" && tokenPrice > 0) {
      setAmount((numAmount / tokenPrice).toFixed(8));
      setInputMode("token");
    } else {
      setInputMode(inputMode === "token" ? "usd" : "token");
    }
  };

  const handleSend = async () => {
    if (
      selectedToken &&
      (recipientAddress || addressFromDomain) &&
      isValidAmount &&
      activeAccountAddress
    ) {
      setIsEstimatingGas(true);
      try {
        const estimate = await estimateGas(
          selectedToken,
          tokenAmount, // Use tokenAmount instead of usdAmount for gas estimation
          isValidDomain && addressFromDomain
            ? addressFromDomain
            : recipientAddress,
          activeAccountAddress
        );
        setGasEstimate(estimate);
        setStep("confirm");
      } catch (error) {
        console.error("Failed to estimate gas:", error);
        alert("Failed to estimate gas fees. Please try again.");
      } finally {
        setIsEstimatingGas(false);
      }
    }
  };

  const handleConfirmSend = async () => {
    if (
      selectedToken &&
      (recipientAddress || addressFromDomain) &&
      isValidAmount &&
      gasEstimate &&
      activeAccountAddress
    ) {
      setIsEstimatingGas(true); // Reuse loading state for sending

      try {
        console.log("🚀 Starting transaction send process...");

        // Build the transaction object
        let transactionData: any;

        if (
          selectedToken.symbol === "ETH" ||
          selectedToken.symbol === "HYPE" ||
          selectedToken.contractAddress === "native" ||
          selectedToken.contractAddress === "NATIVE"
        ) {
          // Native token transfer (ETH, HYPE)
          transactionData = {
            type: "eth_sendTransaction",
            to: isValidDomain ? addressFromDomain : recipientAddress,
            value: `0x${Math.floor(parseFloat(tokenAmount) * 1e18).toString(
              16
            )}`,
            gas: `0x${parseInt(gasEstimate.gasLimit).toString(16)}`,
            gasPrice: `0x${Math.floor(
              parseInt(gasEstimate.gasPrice) * 1e9
            ).toString(16)}`, // Convert gwei to wei
            chainId: getChainId(selectedToken.chain),
          };
        } else {
          // ERC-20 token transfer
          const transferMethodId = "0xa9059cbb";
          const paddedRecipient = isValidDomain
            ? addressFromDomain?.slice(2).padStart(64, "0")
            : recipientAddress.slice(2).padStart(64, "0");
          const paddedAmount = Math.floor(
            parseFloat(tokenAmount) * Math.pow(10, selectedToken.decimals || 18)
          )
            .toString(16)
            .padStart(64, "0");

          transactionData = {
            type: "eth_sendTransaction",
            to: selectedToken.contractAddress,
            value: "0x0", // No ETH value for ERC-20 transfers
            data: transferMethodId + paddedRecipient + paddedAmount,
            gas: `0x${parseInt(gasEstimate.gasLimit).toString(16)}`,
            gasPrice: `0x${Math.floor(
              parseInt(gasEstimate.gasPrice) * 1e9
            ).toString(16)}`, // Convert gwei to wei
            chainId: getChainId(selectedToken.chain),
          };
        }

        console.log("📝 Transaction data prepared:", transactionData);

        // Send transaction through the EVM handler
        const result = await sendMessage("EVM_SEND_TRANSACTION", {
          accountId: activeAccountId,
          transactionData,
        });

        console.log("✅ Transaction sent successfully:", result);

        // Show success message
        const txHash = result.transactionHash || "Processing...";
        const explorerUrl = getExplorerUrl(selectedToken.chain, txHash);

        alert(
          `🎉 Transaction sent successfully!\n\n` +
            `Sent: ${formatDisplayNumber(tokenAmount, "token")} ${
              selectedToken.symbol
            }\n` +
            `To: ${
              isValidDomain
                ? addressFromDomain?.slice(0, 6) +
                  "..." +
                  addressFromDomain?.slice(-4)
                : recipientAddress.slice(0, 6) +
                  "..." +
                  recipientAddress.slice(-4)
            }\n` +
            `Gas Fee: ${gasEstimate.gasCostEth} ETH (≈$${gasEstimate.gasCostUsd})\n\n` +
            `Transaction Hash: ${txHash}\n\n` +
            `Your transaction is being processed on the ${selectedToken.chain} network.\n` +
            (explorerUrl ? `\nView on Explorer: ${explorerUrl}` : "")
        );

        closeDialog();
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
        setIsEstimatingGas(false);
      }
    }
  };

  const handleBackFromConfirm = () => {
    setStep("send");
    setGasEstimate(null);
    setAddressFromDomain(null);
    setIsValidDomain(false);
  };

  useEffect(() => {
    const checkDomain = async () => {
      const addressResponse = await getAddressByDomain(
        debouncedRecipientAddress
      );

      const isValidDomain = addressResponse !== null;
      setIsValidDomain(isValidDomain);
      if (isValidDomain) {
        setAddressFromDomain(addressResponse);
      }
    };
    checkDomain();
  }, [debouncedRecipientAddress]);

  const isValidAddress = useMemo(() => {
    return (
      (debouncedRecipientAddress.length > 0 &&
        debouncedRecipientAddress.startsWith("0x")) ||
      isValidDomain
    );
  }, [debouncedRecipientAddress, isValidDomain]);

  const isDomainFormatted = useMemo(() => {
    return (
      debouncedRecipientAddress.length >= 0 &&
      !!debouncedRecipientAddress.match(/^[a-zA-Z0-9-]+\.hl$/)
    );
  }, [debouncedRecipientAddress]);

  const renderTokenSelection = () => (
    <DialogWrapper>
      <DialogHeader title="Select Token to Send" onClose={closeDialog} />
      <DialogContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading tokens...</div>
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">Error loading tokens</div>
          </div>
        ) : (
          <TokenList
            tokens={evmTokens}
            onTokenClick={handleTokenSelect}
            emptyMessage="No EVM tokens available to send"
          />
        )}
      </DialogContent>
      <DialogFooter>
        <Button className="w-full" onClick={closeDialog}>
          Cancel
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );

  const renderSendForm = () => (
    <DialogWrapper>
      <DialogHeader
        title={`Send ${selectedToken?.symbol || "Token"}`}
        onClose={handleBack}
        icon={<ArrowLeft className="size-4 text-white" />}
      />
      <DialogContent>
        {selectedToken && (
          <>
            {/* Token Display */}
            <div className="flex items-center justify-center size-24 bg-[var(--card-color)] rounded-full relative mx-auto mb-6">
              <p className="text-white text-2xl font-bold">
                {selectedToken.symbol.charAt(0).toUpperCase()}
              </p>
              {selectedToken.chain && (
                <div className="absolute bottom-0 p-1 right-0 flex items-center justify-center bg-white/90 rounded-full">
                  <img
                    src={getNetworkIcon(selectedToken.chain)}
                    alt={selectedToken.chain}
                    className="size-6 rounded-full"
                  />
                </div>
              )}
            </div>

            {/* Recipient Address Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Recipient Address
              </label>
              <Input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                onKeyDown={() => {}}
                placeholder="0x..."
                className={`${
                  recipientAddress && !isValidAddress
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-white/10 focus:ring-[var(--primary-color-light)]"
                }`}
              />
              {recipientAddress && !isValidAddress && !isDomainFormatted && (
                <div className="text-muted-foreground text-xs rounded-full bg-red-500/10 px-4 py-2 flex items-center">
                  <CircleAlert className="size-4 mr-2" />{" "}
                  <p>Please enter a valid address starting with 0x</p>
                </div>
              )}
              {recipientAddress && isDomainFormatted && !isValidDomain && (
                <div className="text-muted-foreground text-xs rounded-full bg-red-500/10 px-4 py-2 flex items-center">
                  <CircleAlert className="size-4 mr-2" />{" "}
                  <p>Invalid Hyperliquid Name</p>
                </div>
              )}
              {recipientAddress && isValidDomain && isDomainFormatted && (
                <div className="text-muted-foreground text-xs rounded-full bg-green-500/10 px-4 py-2 flex items-center">
                  <CircleCheck className="size-4 mr-2" />{" "}
                  <p>
                    Valid destination: {addressFromDomain?.slice(0, 6)}...
                    {addressFromDomain?.slice(-4)}
                  </p>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Amount
                </label>
                <Button
                  onClick={toggleInputMode}
                  className="px-2 py-1 text-xs bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 text-white"
                >
                  {inputMode === "token" ? (
                    <DollarSign className="size-3" />
                  ) : (
                    <Coins className="size-3" />
                  )}
                  {inputMode === "token" ? "USD" : selectedToken.symbol}
                </Button>
              </div>

              {/* Input field with Max button */}
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={inputMode === "token" ? "0.0" : "0.00"}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-[var(--card-color)] text-white placeholder-gray-400 pr-12 text-base transition-colors duration-200 ${
                    amount && !isValidAmount
                      ? "border-red-500 focus:ring-red-500"
                      : "border-white/10 focus:ring-[var(--primary-color-light)]"
                  }`}
                  step={inputMode === "token" ? "0.000001" : "0.01"}
                  min="0"
                />
                <Button
                  onClick={handleMaxClick}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/80"
                >
                  Max
                </Button>
              </div>

              {/* Conversion and Available Balance */}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>
                  {inputMode === "token"
                    ? `≈ $${conversionAmount}`
                    : `≈ ${conversionAmount} ${selectedToken.symbol}`}
                </span>
                <span>
                  Available:{" "}
                  {inputMode === "token"
                    ? `${formatDisplayNumber(
                        selectedToken.balanceFormatted,
                        "token"
                      )} ${selectedToken.symbol}`
                    : formatCurrency(selectedToken.usdValue)}
                </span>
              </div>

              {/* Validation message */}
              {amount && !isValidAmount && (
                <p className="text-red-400 text-xs">
                  {inputMode === "token"
                    ? `Insufficient balance. Max: ${formatDisplayNumber(
                        selectedToken.balanceFormatted,
                        "token"
                      )} ${selectedToken.symbol}`
                    : `Insufficient balance. Max: ${formatCurrency(
                        selectedToken.usdValue
                      )}`}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleSend}
          className="flex-1"
          disabled={!isValidAddress || !isValidAmount || isEstimatingGas}
        >
          {isEstimatingGas ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Estimating Gas...
            </>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              Continue
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );

  const renderConfirmation = () => (
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
        {selectedToken && gasEstimate && (
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
                      <p className="text-white text-xs font-bold">
                        {selectedToken.symbol.charAt(0).toUpperCase()}
                      </p>
                    </div>
                    <span className="text-white font-medium">
                      {selectedToken.symbol}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount</span>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {formatDisplayNumber(tokenAmount, "token")}{" "}
                      {selectedToken.symbol}
                    </div>
                    <div className="text-gray-400 text-sm">
                      ≈ ${formatConversionNumber(usdAmount, "usd")}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">To</span>
                  <span className="text-white font-mono text-sm">
                    {recipientAddress.slice(0, 6)}...
                    {recipientAddress.slice(-4)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Network</span>
                  <div className="flex items-center">
                    <img
                      src={getNetworkIcon(selectedToken.chain)}
                      alt={selectedToken.chain}
                      className="size-5 rounded-full mr-2"
                    />
                    <span className="text-white capitalize">
                      {selectedToken.chain}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gas Fee Details */}
            <div className="bg-[var(--card-color)] rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <AlertTriangle className="size-5 mr-2 text-yellow-500" />
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
                      {gasEstimate.gasCostEth} ETH
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
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={isEstimatingGas}
        >
          {isEstimatingGas ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending Transaction...
            </>
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

  if (step === "select") return renderTokenSelection();
  if (step === "send") return renderSendForm();
  return renderConfirmation();
};
