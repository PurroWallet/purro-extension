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
        `Account ${accounts.length > 0 ? accounts.length + 1 : 1}`
      );
    }
  }, [accounts, accountName, setAccountName, initialized]);

  const validatePrivateKey = async () => {
    if (!privateKey) {
      return false;
    }

    try {
      // First validate the private key format and get address
      let isValid = false;
      let walletAddress = '';

      // EVM chains (Ethereum, Hyperliquid, Base, Arbitrum) all use the same validation
      if (
        chain === 'ethereum' ||
        chain === 'hyperevm' ||
        chain === 'base' ||
        chain === 'arbitrum'
      ) {
        try {
          isValid = evmWalletKeyUtils.isValidPrivateKey(privateKey);

          if (isValid) {
            const wallet = evmWalletKeyUtils.fromPrivateKey(privateKey);
            walletAddress = wallet.address;
          }
        } catch (evmError) {
          console.error(`❌ EVM validation error for ${chain}:`, evmError);
          isValid = false;
        }
      } else if (chain === 'solana') {
        try {
          isValid = solanaWalletKeyUtils.isValidPrivateKey(privateKey);

          if (isValid) {
            const wallet = solanaWalletKeyUtils.fromPrivateKey(privateKey);
            walletAddress = wallet.address;
          }
        } catch (solanaError) {
          console.error('❌ Solana validation error:', solanaError);
          isValid = false;
        }
      } else if (chain === 'sui') {
        try {
          isValid = suiWalletKeyUtils.isValidPrivateKey(privateKey);

          if (isValid) {
            const wallet = suiWalletKeyUtils.fromPrivateKey(privateKey);
            walletAddress = wallet.address;
          }
        } catch (suiError) {
          console.error('❌ Sui validation error:', suiError);
          isValid = false;
        }
      }

      if (!isValid) {
        console.error(`❌ Private key validation failed for chain: ${chain}`);
        throw new Error('Invalid private key. Please try again.');
      }

      // Set the address for display
      setAddress(walletAddress);

      // Check if private key already exists
      try {
        const exists = await checkPrivateKeyExists(privateKey);

        if (exists) {
          console.warn('⚠️ Private key already exists in wallet');
          setError('This private key is already imported.');
          return false;
        }
      } catch (checkError) {
        console.error('❌ Error checking private key existence:', checkError);
        // Continue with import even if check fails
      }

      return true;
    } catch (error) {
      console.error('❌ Private key validation failed with error:', error);
      console.error('📊 Error details:', {
        message: error instanceof Error ? error.message : String(error),
        chain,
        privateKeyLength: privateKey?.length || 0,
        stack: error instanceof Error ? error.stack : undefined,
      });

      setError('Invalid private key. Please try again.');
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
                setAddress(null); // Clear address when user types

                // Validate and show address if private key is valid
                if (inputValue.trim()) {
                  try {
                    let isValid = false;
                    let walletAddress = '';

                    // EVM chains (Ethereum, Hyperliquid, Base, Arbitrum) all use the same validation
                    if (
                      chain === 'ethereum' ||
                      chain === 'hyperevm' ||
                      chain === 'base' ||
                      chain === 'arbitrum'
                    ) {
                      try {
                        isValid =
                          evmWalletKeyUtils.isValidPrivateKey(inputValue);

                        if (isValid) {
                          const wallet =
                            evmWalletKeyUtils.fromPrivateKey(inputValue);
                          walletAddress = wallet.address;
                        }
                      } catch (evmError) {
                        isValid = false;
                      }
                    } else if (chain === 'solana') {
                      try {
                        isValid =
                          solanaWalletKeyUtils.isValidPrivateKey(inputValue);

                        if (isValid) {
                          const wallet =
                            solanaWalletKeyUtils.fromPrivateKey(inputValue);
                          walletAddress = wallet.publicKey;
                        }
                      } catch (solanaError) {
                        isValid = false;
                      }
                    } else if (chain === 'sui') {
                      try {
                        isValid =
                          suiWalletKeyUtils.isValidPrivateKey(inputValue);

                        if (isValid) {
                          const wallet =
                            suiWalletKeyUtils.fromPrivateKey(inputValue);
                          walletAddress = wallet.address;
                        }
                      } catch (suiError) {
                        isValid = false;
                      }
                    }
                  } catch (error) {
                    // Ignore validation errors during typing
                  }
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
              placeholder={`Account ${accounts.length > 0 ? accounts.length + 1 : 1}`}
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
