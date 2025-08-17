import { Button, InputPassword } from '@/client/components/ui';
import useCreateWalletStore from '@/client/hooks/use-create-wallet-store';
import { Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import useWallet from '@/client/hooks/use-wallet';
import useWalletStore from '@/client/hooks/use-wallet-store';
import {
  evmWalletKeyUtils,
  solanaWalletKeyUtils,
  suiWalletKeyUtils,
} from '@/background/utils/keys';

// Constants for easy customization
const VALIDATION_CONFIG = {
  EVM_CHAINS: ['ethereum', 'hyperevm', 'base', 'arbitrum'],
  ERROR_MESSAGES: {
    INVALID_PRIVATE_KEY: 'Invalid private key. Please try again.',
    ALREADY_IMPORTED: 'This private key is already imported.',
  },
  ACCOUNT_NAME_PREFIX: 'Account',
} as const;

// Utility function to validate private key and get address
const validatePrivateKeyFormat = (
  privateKeyValue: string,
  chain: string | null
) => {
  if (!privateKeyValue.trim() || !chain) {
    return { isValid: false, address: '' };
  }

  try {
    let isValid = false;
    let walletAddress = '';

    if (
      VALIDATION_CONFIG.EVM_CHAINS.includes(
        chain as (typeof VALIDATION_CONFIG.EVM_CHAINS)[number]
      )
    ) {
      try {
        isValid = evmWalletKeyUtils.isValidPrivateKey(privateKeyValue);
        if (isValid) {
          const wallet = evmWalletKeyUtils.fromPrivateKey(privateKeyValue);
          walletAddress = wallet.address;
        }
      } catch {
        isValid = false;
      }
    } else if (chain === 'solana') {
      try {
        isValid = solanaWalletKeyUtils.isValidPrivateKey(privateKeyValue);
        if (isValid) {
          const wallet = solanaWalletKeyUtils.fromPrivateKey(privateKeyValue);
          walletAddress = wallet.address;
        }
      } catch {
        isValid = false;
      }
    } else if (chain === 'sui') {
      try {
        isValid = suiWalletKeyUtils.isValidPrivateKey(privateKeyValue);
        if (isValid) {
          const wallet = suiWalletKeyUtils.fromPrivateKey(privateKeyValue);
          walletAddress = wallet.address;
        }
      } catch {
        isValid = false;
      }
    }

    return { isValid, address: walletAddress };
  } catch {
    return { isValid: false, address: '' };
  }
};

const ImportPrivateKey = ({ onNext }: { onNext: () => void }) => {
  const { chain, privateKey, setPrivateKey, accountName, setAccountName } =
    useCreateWalletStore();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const { checkPrivateKeyExists } = useWallet();
  const { accounts, initialized } = useWalletStore();

  // Auto-set account name based on existing accounts count
  useEffect(() => {
    if (!accountName && initialized) {
      setAccountName(
        `${VALIDATION_CONFIG.ACCOUNT_NAME_PREFIX} ${accounts.length > 0 ? accounts.length + 1 : 1}`
      );
    }
  }, [accounts, accountName, setAccountName, initialized]);

  const validatePrivateKey = async () => {
    if (!privateKey) {
      return false;
    }

    try {
      // Validate the private key format and get address
      const validation = validatePrivateKeyFormat(privateKey, chain ?? null);

      if (!validation.isValid) {
        throw new Error(VALIDATION_CONFIG.ERROR_MESSAGES.INVALID_PRIVATE_KEY);
      }

      // Set the address for display
      setAddress(validation.address);

      // Check if private key already exists
      try {
        const exists = await checkPrivateKeyExists(privateKey);

        if (exists) {
          setError(VALIDATION_CONFIG.ERROR_MESSAGES.ALREADY_IMPORTED);
          return false;
        }
      } catch {
        // Continue with import even if check fails
      }

      return true;
    } catch {
      setError(VALIDATION_CONFIG.ERROR_MESSAGES.INVALID_PRIVATE_KEY);
      setAddress(null);
      return false;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">Import Private Key</h1>
          <p className="text-base text-gray-500 text-center">
            {chain == null && 'Select the chain'}
            {chain === 'ethereum' && 'Enter your Ethereum private key'}
            {chain === 'solana' && 'Enter your Solana private key'}
            {chain === 'sui' && 'Enter your Sui private key'}
            {chain === 'hyperevm' && 'Enter your Hyperliquid private key'}
            {chain === 'base' && 'Enter your Base private key'}
            {chain === 'arbitrum' && 'Enter your Arbitrum private key'}
          </p>
        </div>
        {chain != null && (
          <div className="flex flex-col gap-2">
            <InputPassword
              placeholder={`Enter your ${chain} private key`}
              value={privateKey ?? ''}
              showToggle={false}
              onChange={async e => {
                const inputValue = e.target.value;

                setPrivateKey(inputValue);
                setError(null); // Clear error when user types

                // Validate and show address if private key is valid
                if (inputValue.trim()) {
                  const validation = validatePrivateKeyFormat(
                    inputValue,
                    chain ?? null
                  );
                  if (validation.isValid) {
                    setAddress(validation.address);
                  } else {
                    setAddress(null);
                  }
                } else {
                  setAddress(null); // Clear address only when input is empty
                }
              }}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  if (await validatePrivateKey()) {
                    onNext();
                  }
                }
              }}
            />

            <input
              type="text"
              placeholder={`${VALIDATION_CONFIG.ACCOUNT_NAME_PREFIX} ${accounts.length > 0 ? accounts.length + 1 : 1}`}
              value={accountName ?? ''}
              onChange={e => setAccountName(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white placeholder-gray-400 text-base"
            />

            {error && (
              <div className="text-red-500 mt-2 text-base flex items-center gap-1">
                <X />
                {error}
              </div>
            )}
            {address && (
              <div className="text-[var(--primary-color-light)] mt-2 text-sm flex items-center gap-1 break-all">
                <Check />
                {address}
              </div>
            )}
          </div>
        )}
      </div>
      <Button
        className="w-full"
        disabled={!privateKey}
        onClick={async () => {
          if (await validatePrivateKey()) {
            onNext();
          }
        }}
      >
        Import
      </Button>
    </div>
  );
};

export default ImportPrivateKey;
