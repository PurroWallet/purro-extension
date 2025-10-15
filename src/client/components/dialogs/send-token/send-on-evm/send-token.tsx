import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  Input,
} from '@/client/components/ui';
import useSendTokenStore from '@/client/hooks/use-send-token-store';
import { formatCurrency } from '@/client/utils/formatters';
import {
  Send,
  CircleAlert,
  CircleCheck,
  Loader2,
  BookText,
  ArrowUpDown,
  XIcon,
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import useDebounce from '@/client/hooks/use-debounce';
import { getAddressByDomain } from '@/client/services/hyperliquid-name-api';
import { getNetworkIcon } from '@/utils/network-icons';
import TokenLogo from '@/client/components/token-logo';
import { AddressSelectorDropdown } from '../address-selector-dropdown';

type InputMode = 'token' | 'usd';

// Helper function to format numbers for display
const formatDisplayNumber = (
  value: string | number,
  mode: InputMode
): string => {
  if (!value || value === '0') return '0';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  if (mode === 'usd') {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } else {
    if (num >= 1000) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } else if (num >= 1) {
      return num.toLocaleString('en-US', {
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
  if (!value || value === '0') return '0';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  if (mode === 'usd') {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    if (num >= 1) {
      return num.toLocaleString('en-US', {
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
  const [inputMode, setInputMode] = useState<InputMode>('token');
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isValidDomain, setIsValidDomain] = useState<boolean>(false);
  const debouncedRecipientAddress = useDebounce(recipient, 500);
  const [addressFromDomain, setAddressFromDomain] = useState<string | null>(
    null
  );
  const [isLoadingDomain, setIsLoadingDomain] = useState(false);

  const onBack = () => {
    setStep('select');
  };

  // Calculate converted amounts
  const { isValidAmount, conversionAmount } = useMemo(() => {
    if (!token || !amount || isNaN(parseFloat(amount))) {
      return {
        isValidAmount: false,
        conversionAmount: '0',
      };
    }

    const numAmount = parseFloat(amount);
    const tokenPrice = token.usdPrice || 0;

    if (inputMode === 'token') {
      const usdVal = tokenPrice > 0 ? (numAmount * tokenPrice).toFixed(2) : '0';
      return {
        isValidAmount: numAmount > 0 && numAmount <= token.balanceFormatted,
        conversionAmount: formatConversionNumber(usdVal, 'usd'),
      };
    } else {
      const tokenVal =
        tokenPrice > 0 ? (numAmount / tokenPrice).toFixed(8) : '0';
      return {
        isValidAmount: numAmount > 0 && numAmount <= (token.usdValue || 0),
        conversionAmount: formatConversionNumber(tokenVal, 'token'),
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
        console.error('Failed to check domain:', error);
      } finally {
        setIsLoadingDomain(false);
      }
    };
    checkDomain();
  }, [debouncedRecipientAddress, isDomainFormatted]);

  const isValidAddress = useMemo(() => {
    return (
      (debouncedRecipientAddress.length > 0 &&
        debouncedRecipientAddress.startsWith('0x')) ||
      isValidDomain
    );
  }, [debouncedRecipientAddress, isValidDomain]);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isAddressDropdownOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 340;
      const dropdownHeight = 400;

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
  }, [isAddressDropdownOpen]);

  const handleAddressSelect = (address: string) => {
    setRecipient(address);
    setIsAddressDropdownOpen(false);
  };

  const handleMaxClick = () => {
    if (!token) return;

    if (inputMode === 'token') {
      setAmount(token.balanceFormatted.toString());
    } else {
      setAmount((token.usdValue || 0).toFixed(2));
    }
  };

  const toggleInputMode = () => {
    if (!token || !amount) {
      setInputMode(inputMode === 'token' ? 'usd' : 'token');
      return;
    }

    // Convert current amount to the other mode
    const numAmount = parseFloat(amount);
    const tokenPrice = token.usdPrice || 0;

    if (inputMode === 'token' && tokenPrice > 0) {
      setAmount((numAmount * tokenPrice).toFixed(2));
      setInputMode('usd');
    } else if (inputMode === 'usd' && tokenPrice > 0) {
      setAmount((numAmount / tokenPrice).toFixed(8));
      setInputMode('token');
    } else {
      setInputMode(inputMode === 'token' ? 'usd' : 'token');
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title={`Send ${token?.symbol || 'Token'}`}
        onClose={onBack}
        icon={<XIcon className="size-4 text-white" />}
      />
      <DialogContent>
        {token && (
          <>
            {/* Token Display */}
            <div className="flex items-center justify-center size-24 bg-[var(--card-color)] rounded-full relative mx-auto">
              <TokenLogo
                symbol={token.symbol}
                networkId={token.chain}
                existingLogo={token.logo}
                tokenAddress={token.contractAddress}
                className="size-24 rounded-full object-cover"
                fallbackText={token.symbol.charAt(0).toUpperCase()}
              />
              {token.chain && (
                <div className="absolute bottom-0 right-0 flex items-center justify-center bg-[var(--card-color)] rounded-full">
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
              <label className="block text-base ">Recipient Address</label>
              <div className="w-full relative">
                <Input
                  type="text"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="0x... or name.hl"
                  className={`pr-12 ${
                    recipient && !isValidAddress
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-white/10 focus:ring-[var(--primary-color-light)]'
                  }`}
                />
                <button
                  ref={buttonRef}
                  onClick={() =>
                    setIsAddressDropdownOpen(!isAddressDropdownOpen)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
                  title="Select from address book"
                >
                  <BookText className="size-4 text-white" />
                </button>

                {/* Address Selector Dropdown */}
                <AddressSelectorDropdown
                  isOpen={isAddressDropdownOpen}
                  onClose={() => setIsAddressDropdownOpen(false)}
                  onSelect={handleAddressSelect}
                  position={dropdownPosition}
                  chain="eip155"
                />
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
                <label className="block text-base">Amount</label>
                <span className="text-sm text-gray-400">
                  Balance:{' '}
                  {inputMode === 'token'
                    ? `${formatDisplayNumber(
                        token.balanceFormatted,
                        'token'
                      )} ${token.symbol}`
                    : formatCurrency(token.usdValue)}
                </span>
              </div>

              {/* Input field with Max button */}
              <div className="flex items-stretch gap-1">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={inputMode === 'token' ? '0.0' : '0.00'}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-[var(--card-color)] text-white placeholder-gray-400 text-base transition-colors duration-200 ${
                    amount && !isValidAmount
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-white/10 focus:ring-[var(--primary-color-light)]'
                  }`}
                  step={inputMode === 'token' ? '0.000001' : '0.01'}
                  min="0"
                />
                <Button
                  onClick={handleMaxClick}
                  className="px-4 text-xs bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/80 rounded-lg"
                >
                  Max
                </Button>
              </div>

              {/* Conversion and Available Balance */}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span
                  onClick={toggleInputMode}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  {inputMode === 'token'
                    ? `≈ $${conversionAmount}`
                    : `≈ ${conversionAmount} ${token.symbol}`}{' '}
                  <ArrowUpDown className="size-4" />
                </span>
              </div>

              {/* Validation message */}
              {amount && !isValidAmount && (
                <p className="text-red-400 text-xs">
                  {inputMode === 'token'
                    ? `Insufficient balance. Max: ${formatDisplayNumber(
                        token.balanceFormatted,
                        'token'
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
          onClick={() => setStep('confirm')}
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
