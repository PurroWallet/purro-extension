import { Button } from '@/client/components/ui';
import useCreateWalletStore from '@/client/hooks/use-create-wallet-store';
import { X } from 'lucide-react';
import { useState } from 'react';
import useWallet from '@/client/hooks/use-wallet';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { ChainType } from '@/background/types/account';
import { evmWalletKeyUtils } from '@/background/utils/keys';
import { getAddressByDomain } from '@/client/services/hyperliquid-name-api';

const ImportWatchOnly = ({ onNext }: { onNext: () => void }) => {
  const { address, chain, accountName, setAddress, setAccountName } =
    useCreateWalletStore();
  const { importWatchOnlyWallet, checkWatchOnlyAddressExists } = useWallet();
  const { accounts } = useWalletStore();
  const [error, setError] = useState<string | null>(null);

  const validateAddress = (address: string, blockchain: string): boolean => {
    if (!address) {
      return false;
    }
    try {
      switch (blockchain) {
        case 'ethereum':
        case 'hyperevm':
        case 'base':
        case 'arbitrum':
          return evmWalletKeyUtils.isValidAddress(address);
        case 'solana':
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
        case 'sui':
          return /^0x[a-fA-F0-9]{64}$/.test(address);
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  };

  const handleImport = async () => {
    if (!address) {
      setError('Address is required');
      return;
    }

    if (!chain) {
      setError('Please select a chain');
      return;
    }

    const addressFromDomain = await getAddressByDomain(address);
    const isValidDomain = addressFromDomain !== null;

    const isValidAddress = isValidDomain
      ? validateAddress(addressFromDomain, chain)
      : validateAddress(address, chain);

    if (!isValidAddress) {
      setError(`Invalid address format for selected chain`);
      return;
    }

    const finalAccountName = accountName || `Account ${accounts.length + 1}`;

    if (!finalAccountName || !finalAccountName.trim()) {
      setError('Account name is required');
      return;
    }

    try {
      const addressExists = await checkWatchOnlyAddressExists(address);

      if (addressExists) {
        setError('This address is already imported as watch-only');
        return;
      }
    } catch (err) {
      setError('Failed to validate address');
      return;
    }

    try {
      let finalChain: ChainType;
      if (
        chain === 'hyperevm' ||
        chain === 'base' ||
        chain === 'arbitrum' ||
        chain === 'ethereum'
      ) {
        finalChain = 'eip155';
      } else {
        finalChain = chain as ChainType;
      }

      await importWatchOnlyWallet(
        isValidDomain ? addressFromDomain : address,
        finalChain,
        finalAccountName
      );
      onNext();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to import watch-only wallet';
      setError(errorMessage);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">
            Import Watch-Only Wallet
          </h1>
          <p className="text-base text-gray-500 text-center">
            {chain == null && 'Select the chain'}
            {chain === 'ethereum' && 'Enter your Ethereum wallet address'}
            {chain === 'solana' && 'Enter your Solana wallet address'}
            {chain === 'sui' && 'Enter your Sui wallet address'}
            {chain === 'hyperevm' &&
              'Enter your Hyperliquid wallet address or Hyperliquid Name'}
            {chain === 'base' && 'Enter your Base wallet address'}
            {chain === 'arbitrum' && 'Enter your Arbitrum wallet address'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={address || ''}
            onChange={e => {
              setAddress(e.target.value);
              setError(null);
            }}
            placeholder="Enter wallet address or Hyperliquid Name"
            className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white placeholder-gray-400 text-base font-mono"
          />

          <input
            type="text"
            placeholder={`Account ${accounts.length + 1}`}
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
        </div>
      </div>
      <Button
        className="w-full"
        disabled={!address || !chain}
        onClick={handleImport}
      >
        Import
      </Button>
    </div>
  );
};

export default ImportWatchOnly;
