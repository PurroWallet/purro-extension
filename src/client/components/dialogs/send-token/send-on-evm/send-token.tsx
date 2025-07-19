import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  InputCurrency,
  Input,
} from "@/client/components/ui";
import useSendTokenStore from "@/client/hooks/use-send-token-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { formatCurrency } from "@/client/utils/formatters";
import { BookUser } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { truncateAddress } from "@/client/utils/formatters";
import { evmWalletKeyUtils } from "@/background/utils/keys";
import { AccountIcon } from "@/client/components/account";

const SendToken = () => {
  const { token, setStep, recipient, setRecipient, amount, setAmount } =
    useSendTokenStore();
  const { accounts, wallets } = useWalletStore();

  const [isUsdMode, setIsUsdMode] = useState(false);
  const [hasAmountError, setHasAmountError] = useState(false);
  const [hasRecipientError, setHasRecipientError] = useState(false);
  const [displayInput, setDisplayInput] = useState<string | undefined>(
    undefined
  );
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onBack = () => {
    setStep("select");
  };

  const isAddressValid = (address: string) => {
    return evmWalletKeyUtils.isValidAddress(address);
  };

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
    setHasRecipientError(!isAddressValid(address));
    setIsAddressDropdownOpen(false);
  };

  // Convert between USD and token amount
  const convertUsdToToken = (usdValue: string): string => {
    if (!token?.usdPrice || !usdValue) return "0";
    const usdAmount = parseFloat(usdValue);
    const tokenAmount = usdAmount / token.usdPrice;

    return tokenAmount.toString();
  };

  const convertTokenToUsd = (tokenValue: string): string => {
    if (!token?.usdPrice || !tokenValue) return "0";
    const tokenAmount = parseFloat(tokenValue);
    const usdAmount = tokenAmount * token.usdPrice;

    return usdAmount.toFixed(2);
  };

  // Display value based on current mode
  const displayCurrency = isUsdMode ? "USD" : token?.symbol || "TOKEN";
  const displayMaxValue = isUsdMode
    ? convertTokenToUsd(token?.balanceFormatted.toString() || "0")
    : token?.balanceFormatted.toString() || "0";

  // Use displayInput for what user sees, amount for actual token storage
  // Only fallback to converted value if displayInput has never been set (initial load)
  const displayValue =
    displayInput !== undefined
      ? displayInput
      : isUsdMode
      ? convertTokenToUsd(amount)
      : amount;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Always set displayInput to what user typed (including empty string)
    setDisplayInput(inputValue);

    let tokenAmount = "";

    if (inputValue === "") {
      // If user cleared input, clear amount too
      tokenAmount = "";
    } else if (isUsdMode) {
      // Convert USD input to token amount for storage
      tokenAmount = convertUsdToToken(inputValue);
    } else {
      // Direct token amount
      tokenAmount = inputValue;
    }

    setAmount(tokenAmount);

    // Validate against max balance (skip validation if empty)
    if (tokenAmount === "") {
      setHasAmountError(false);
    } else {
      const maxBalance = parseFloat(token?.balanceFormatted.toString() || "0");
      const currentAmount = parseFloat(tokenAmount || "0");

      if (currentAmount > maxBalance) {
        setHasAmountError(true);
      } else {
        setHasAmountError(false);
      }
    }
  };

  const handleMaxClick = () => {
    const maxBalance = token?.balanceFormatted.toString() || "0";
    setAmount(maxBalance);

    // Set display input based on current mode
    if (isUsdMode) {
      setDisplayInput(convertTokenToUsd(maxBalance));
    } else {
      setDisplayInput(maxBalance);
    }

    setHasAmountError(false); // Clear error when setting max
  };

  const handleSwitchCurrency = () => {
    const newUsdMode = !isUsdMode;
    setIsUsdMode(newUsdMode);

    // Update display input for new mode
    if (amount) {
      if (newUsdMode) {
        // Switching to USD mode - show USD value
        setDisplayInput(convertTokenToUsd(amount));
      } else {
        // Switching to token mode - show token value
        setDisplayInput(amount);
      }
    }

    // Re-validate after switching currency mode
    const maxBalance = parseFloat(token?.balanceFormatted.toString() || "0");
    const currentAmount = parseFloat(amount || "0");
    setHasAmountError(currentAmount > maxBalance);
  };

  return (
    <DialogWrapper>
      <DialogHeader title={`Send ${token?.symbol}`} onClose={onBack} />
      <DialogContent>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">
            Recipient Address
          </label>
          <div className="w-full relative">
            <Input
              value={recipient}
              type="text"
              onChange={(e) => {
                setRecipient(e.target.value);
                setHasRecipientError(!isAddressValid(e.target.value));
              }}
              hasError={hasRecipientError}
              placeholder="Enter public address (0x)"
              className={`pr-12 ${
                hasRecipientError &&
                "border-red-500 focus:border-red-500 focus:ring-red-500"
              }`}
            />
            <button
              ref={buttonRef}
              onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            >
              <BookUser className="size-5" />
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
                                wallet?.eip155?.address ||
                                  wallet?.sui?.address ||
                                  ""
                              )
                            }
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors last:rounded-b-lg whitespace-nowrap cursor-pointer"
                          >
                            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                              <AccountIcon icon={account.icon} alt="Account" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-[var(--text-color)]">
                                {account.name}
                              </p>
                              <p className="text-xs text-[var(--text-color)]/60">
                                {truncateAddress(
                                  wallet?.eip155?.address ||
                                    wallet?.sui?.address ||
                                    ""
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

          {hasRecipientError && (
            <p className="text-red-500 text-xs">Address not valid</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">
            Amount
          </label>
          <InputCurrency
            value={displayValue}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            currency={displayCurrency}
            maxValue={displayMaxValue}
            onMaxClick={handleMaxClick}
            onSwitchCurrency={handleSwitchCurrency}
            hasError={hasAmountError}
          />
          {hasAmountError && (
            <p className="text-red-500 text-xs mt-1">
              Amount exceeds available balance
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 text-sm">
          <span className="text-gray-300">
            {isUsdMode
              ? `≈ ${formatCurrency(
                  parseFloat(convertUsdToToken(displayValue)),
                  4
                )} ${token?.symbol}`
              : `≈ ${formatCurrency(
                  parseFloat(convertTokenToUsd(displayValue)),
                  2,
                  "$"
                )}`}
          </span>

          <span className="text-gray-400 text-right">
            Available: {token?.balanceFormatted} {token?.symbol}
            {token?.usdPrice &&
              ` (~$${(token.balanceFormatted * token.usdPrice).toFixed(2)})`}
          </span>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          className="w-full"
          disabled={
            !isAddressValid(recipient) ||
            hasAmountError ||
            !amount ||
            parseFloat(amount) <= 0
          }
          onClick={() => setStep("confirm")}
        >
          Confirm Send
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default SendToken;
