import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  Input,
} from "@/client/components/ui";
import useSendTokenStore from "@/client/hooks/use-send-token-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { formatCurrency } from "@/client/utils/formatters";
import {
  ArrowLeft,
  Send,
  DollarSign,
  Coins,
  CircleAlert,
  CircleCheck,
  Loader2,
  BookText,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { truncateAddress } from "@/client/utils/formatters";
import { AccountIcon } from "@/client/components/account";
import useDebounce from "@/client/hooks/use-debounce";
import { getAddressByDomain } from "@/client/services/hyperliquid-name-api";
import { getNetworkIcon } from "@/utils/network-icons";
import { getTokenLogo } from "@/client/utils/icons";

type InputMode = "token" | "usd";

// Helper function to format numbers for display
const formatDisplayNumber = (
  value: string | number,
  mode: InputMode
): string => {
  if (!value || value === "0") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  if (mode === "usd") {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } else {
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

const SendToken = () => {
  const { token, setStep, recipient, setRecipient, amount, setAmount } =
    useSendTokenStore();
  const { accounts, wallets } = useWalletStore();
  const [inputMode, setInputMode] = useState<InputMode>("token");
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isValidDomain, setIsValidDomain] = useState<boolean>(false);
  const debouncedRecipientAddress = useDebounce(recipient, 500);
  const [addressFromDomain, setAddressFromDomain] = useState<string | null>(
    null
  );
  const [isLoadingDomain, setIsLoadingDomain] = useState(false);

  const tokenLogoSrc = token?.icon_url || getTokenLogo(token?.symbol || "");

  const onBack = () => {
    setStep("select");
  };

  // Calculate converted amounts
  const { isValidAmount, conversionAmount } = useMemo(() => {
    if (!token || !amount || isNaN(parseFloat(amount))) {
      return {
        isValidAmount: false,
        conversionAmount: "0",
      };
    }

    const numAmount = parseFloat(amount);
    const tokenPrice = token.usdPrice || 0;

    if (inputMode === "token") {
      const usdVal = tokenPrice > 0 ? (numAmount * tokenPrice).toFixed(2) : "0";
      return {
        isValidAmount: numAmount > 0 && numAmount <= token.balanceFormatted,
        conversionAmount: formatConversionNumber(usdVal, "usd"),
      };
    } else {
      const tokenVal =
        tokenPrice > 0 ? (numAmount / tokenPrice).toFixed(8) : "0";
      return {
        isValidAmount: numAmount > 0 && numAmount <= (token.usdValue || 0),
        conversionAmount: formatConversionNumber(tokenVal, "token"),
      };
    }
  }, [amount, inputMode, token]);

  // Domain validation logic
  const isDomainFormatted = useMemo(() => {
    return (
      debouncedRecipientAddress.length >= 0 &&
      !!debouncedRecipientAddress.match(/^[a-zA-Z0-9-]+\.hl$/)
    );
  }, [debouncedRecipientAddress]);

  useEffect(() => {
    const checkDomain = async () => {
      if (!isDomainFormatted) return;
      setIsLoadingDomain(true);
      try {
        const addressResponse = await getAddressByDomain(
          debouncedRecipientAddress
        );

        const isValidDomain = addressResponse !== null;
        setIsValidDomain(isValidDomain);
        if (isValidDomain) {
          setAddressFromDomain(addressResponse);
        }
      } catch (error) {
        console.error("Failed to check domain:", error);
      } finally {
        setIsLoadingDomain(false);
      }
    };
    checkDomain();
  }, [debouncedRecipientAddress, isDomainFormatted]);

  const isValidAddress = useMemo(() => {
    return (
      (debouncedRecipientAddress.length > 0 &&
        debouncedRecipientAddress.startsWith("0x")) ||
      isValidDomain
    );
  }, [debouncedRecipientAddress, isValidDomain]);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isAddressDropdownOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const dropdownHeight = Math.min(accounts.length * 60 + 40, 240);

      let top = buttonRect.bottom + 8;
      let left = buttonRect.left;

      // Adjust if dropdown would go off-screen horizontally
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // Adjust if dropdown would go off-screen vertically
      if (top + dropdownHeight > window.innerHeight) {
        top = buttonRect.top - dropdownHeight - 8;
      }

      setDropdownPosition({ top, left });
    }
  }, [isAddressDropdownOpen, accounts.length]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isAddressDropdownOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsAddressDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAddressDropdownOpen]);

  const handleAddressSelect = (address: string) => {
    setRecipient(address);
    setIsAddressDropdownOpen(false);
  };

  const handleMaxClick = () => {
    if (!token) return;

    if (inputMode === "token") {
      setAmount(token.balanceFormatted.toString());
    } else {
      setAmount((token.usdValue || 0).toFixed(2));
    }
  };

  const toggleInputMode = () => {
    if (!token || !amount) {
      setInputMode(inputMode === "token" ? "usd" : "token");
      return;
    }

    // Convert current amount to the other mode
    const numAmount = parseFloat(amount);
    const tokenPrice = token.usdPrice || 0;

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

  return (
    <DialogWrapper>
      <DialogHeader
        title={`Send ${token?.symbol || "Token"}`}
        onClose={onBack}
        icon={<ArrowLeft className="size-4 text-white" />}
      />
      <DialogContent>
        {token && (
          <>
            {/* Token Display */}
            <div className="flex items-center justify-center size-24 bg-[var(--card-color)] rounded-full relative mx-auto mb-6">
              {tokenLogoSrc ? (
                <img
                  src={tokenLogoSrc}
                  alt={token.symbol}
                  className="size-24 rounded-full object-cover p-1"
                />
              ) : (
                <p className="text-white text-2xl font-bold">
                  {token.symbol.charAt(0).toUpperCase()}
                </p>
              )}
              {token.chain && (
                <div className="absolute bottom-0 p-1 right-0 flex items-center justify-center bg-white/90 rounded-full">
                  <img
                    src={getNetworkIcon(token.chain)}
                    alt={token.chain}
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
              <div className="w-full relative">
                <Input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x... or name.hl"
                  className={`pr-12 ${
                    recipient && !isValidAddress
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-white/10 focus:ring-[var(--primary-color-light)]"
                  }`}
                />
                <button
                  ref={buttonRef}
                  onClick={() =>
                    setIsAddressDropdownOpen(!isAddressDropdownOpen)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <BookText className="size-4" />
                </button>

                {/* Address Dropdown */}
                {isAddressDropdownOpen &&
                  createPortal(
                    <AnimatePresence>
                      <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="fixed bg-[var(--background-color)] border border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[320px] w-max z-[9999] flex flex-col"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                        }}
                      >
                        <p className="p-3 text-sm font-medium text-[var(--text-color)] border-b border-white/10">
                          Select Address
                        </p>
                        <div className="flex-1 overflow-y-auto">
                          {accounts.map((account) => {
                            const wallet = wallets[account.id];
                            return (
                              <button
                                key={account.id}
                                onClick={() =>
                                  handleAddressSelect(
                                    wallet?.eip155?.address || ""
                                  )
                                }
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors last:rounded-b-lg whitespace-nowrap cursor-pointer"
                              >
                                <div className="size-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                  <AccountIcon
                                    icon={account.icon}
                                    alt="Account"
                                  />
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-medium text-[var(--text-color)]">
                                    {account.name}
                                  </p>
                                  <p className="text-xs text-[var(--text-color)]/60">
                                    {truncateAddress(
                                      wallet?.eip155?.address || ""
                                    )}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </AnimatePresence>,
                    document.body
                  )}
              </div>

              {/* Validation Messages */}
              {recipient && !isValidAddress && !isDomainFormatted && (
                <div className="text-muted-foreground text-xs rounded-full bg-red-500/10 px-4 py-2 flex items-center">
                  <CircleAlert className="size-4 mr-2" />
                  <p>
                    Please enter a valid address starting with 0x or .hl domain
                  </p>
                </div>
              )}
              {recipient &&
                isDomainFormatted &&
                !isValidDomain &&
                !isLoadingDomain && (
                  <div className="text-muted-foreground text-xs rounded-full bg-red-500/10 px-4 py-2 flex items-center">
                    <CircleAlert className="size-4 mr-2" />
                    <p>Invalid Hyperliquid Name</p>
                  </div>
                )}
              {recipient &&
                isValidDomain &&
                isDomainFormatted &&
                !isLoadingDomain && (
                  <div className="text-muted-foreground text-xs rounded-full bg-green-500/10 px-4 py-2 flex items-center">
                    <CircleCheck className="size-4 mr-2" />
                    <p>
                      Valid destination: {addressFromDomain?.slice(0, 6)}...
                      {addressFromDomain?.slice(-4)}
                    </p>
                  </div>
                )}
              {isLoadingDomain && isDomainFormatted && (
                <div className="text-muted-foreground text-xs rounded-full bg-gray-500/10 px-4 py-2 flex items-center">
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  <p>Loading domain...</p>
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
                  {inputMode === "token" ? "USD" : token.symbol}
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
                    : `≈ ${conversionAmount} ${token.symbol}`}
                </span>
                <span>
                  Available:{" "}
                  {inputMode === "token"
                    ? `${formatDisplayNumber(
                        token.balanceFormatted,
                        "token"
                      )} ${token.symbol}`
                    : formatCurrency(token.usdValue)}
                </span>
              </div>

              {/* Validation message */}
              {amount && !isValidAmount && (
                <p className="text-red-400 text-xs">
                  {inputMode === "token"
                    ? `Insufficient balance. Max: ${formatDisplayNumber(
                        token.balanceFormatted,
                        "token"
                      )} ${token.symbol}`
                    : `Insufficient balance. Max: ${formatCurrency(
                        token.usdValue
                      )}`}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={() => setStep("confirm")}
          className="flex-1"
          disabled={!isValidAddress || !isValidAmount}
        >
          <Send className="size-4 mr-2" />
          Continue
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default SendToken;
