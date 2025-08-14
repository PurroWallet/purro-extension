import React, { useState } from 'react';
import { XIcon, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '../ui';
import { Input } from '../ui/input';
import useTestnetTokensStore from '../../hooks/use-testnet-tokens-store';
import useDevModeStore from '../../hooks/use-dev-mode';
import { getTestnetTokenMetadata } from '../../utils/testnet-rpc';

const AddTestnetToken = ({ onClose }: { onClose: () => void }) => {
  const { isDevMode } = useDevModeStore();
  const { addToken, getTokenByAddress } = useTestnetTokensStore();

  const [tokenData, setTokenData] = useState({
    address: '',
    name: '',
    symbol: '',
    decimals: '18',
    icon_url: '',
  });

  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [error, setError] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const handleFetchMetadata = async () => {
    if (!tokenData.address) {
      setError('Please enter a token address first');
      return;
    }

    setError('');
    setIsLoadingMetadata(true);

    try {
      const metadata = await getTestnetTokenMetadata(tokenData.address);
      setTokenData(prev => ({
        ...prev,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals.toString(),
      }));
    } catch (error) {
      console.error('Failed to fetch token metadata:', error);
      setError(
        'Failed to fetch token metadata. Please enter details manually.'
      );
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleAddToken = async () => {
    if (!tokenData.address || !tokenData.symbol || !tokenData.name) {
      setError('Please fill in required fields: address, symbol, and name');
      return;
    }

    // Check if token already exists
    const existingToken = getTokenByAddress(tokenData.address);
    if (existingToken) {
      setError('This token has already been added');
      return;
    }

    setError('');
    setIsAdding(true);

    try {
      addToken({
        address: tokenData.address,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: parseInt(tokenData.decimals) || 18,
        icon_url: tokenData.icon_url || undefined,
      });

      // Success - close dialog
      onClose();
    } catch (error) {
      console.error('Failed to add token:', error);
      setError('Failed to add token. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTokenData(prev => ({ ...prev, address: value }));
    setError(''); // Clear error when user starts typing
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setTokenData(prev => ({ ...prev, [field]: e.target.value }));
      setError(''); // Clear error when user starts typing
    };

  if (!isDevMode) {
    return (
      <DialogWrapper>
        <DialogHeader
          title="Add Testnet Token"
          onClose={onClose}
          icon={<XIcon className="size-4 text-white" />}
        />
        <DialogContent className="flex items-center justify-center">
          <div className="flex items-center justify-center size-16 bg-[var(--card-color)] rounded-full">
            <AlertCircle className="size-8 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              Developer Mode Required
            </h3>
            <p className="text-sm text-white/70">
              Adding testnet tokens is only available in developer mode. Enable
              it in Settings to access this feature.
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button onClick={onClose} variant="secondary" className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogWrapper>
    );
  }

  return (
    <DialogWrapper>
      <DialogHeader
        title="Add Testnet Token"
        onClose={onClose}
        icon={<XIcon className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="space-y-4">
          <div className="text-sm text-white/80">
            <p>
              Add a custom ERC-20 token for HyperEVM Testnet. The token will be
              stored locally and visible in your wallet.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="size-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Token Address */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Token Contract Address (0x...)"
                value={tokenData.address}
                onChange={handleAddressChange}
                className="flex-1"
                hasError={!!error && !tokenData.address}
              />
              <Button
                onClick={handleFetchMetadata}
                disabled={!tokenData.address || isLoadingMetadata}
                variant="secondary"
                className="px-3 min-w-[80px]"
              >
                {isLoadingMetadata ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  'Fetch'
                )}
              </Button>
            </div>
            <p className="text-xs text-white/50">
              Enter the contract address and click "Fetch" to automatically get
              token details
            </p>
          </div>

          {/* Token Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="Token Name"
                value={tokenData.name}
                onChange={handleInputChange('name')}
                hasError={!!error && !tokenData.name}
              />
              <Input
                type="text"
                placeholder="Symbol"
                value={tokenData.symbol}
                onChange={handleInputChange('symbol')}
                hasError={!!error && !tokenData.symbol}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="Decimals (usually 18)"
                value={tokenData.decimals}
                onChange={handleInputChange('decimals')}
              />
              <Input
                type="text"
                placeholder="Icon URL (optional)"
                value={tokenData.icon_url}
                onChange={handleInputChange('icon_url')}
              />
            </div>
          </div>

          {/* Token Preview */}
          {tokenData.name && tokenData.symbol && (
            <div className="bg-[var(--card-color)] rounded-lg p-3 border border-white/10">
              <p className="text-sm text-white/70 mb-2">Preview:</p>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {tokenData.symbol}
                </span>
                <span className="text-sm text-white/80">{tokenData.name}</span>
                <span className="text-xs text-white/50">
                  ({tokenData.decimals} decimals)
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <DialogFooter>
        <div className="flex gap-3 w-full">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAddToken}
            className="flex-1"
            disabled={
              !tokenData.address ||
              !tokenData.symbol ||
              !tokenData.name ||
              isAdding
            }
          >
            {isAdding ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {isAdding ? 'Adding...' : 'Add Token'}
          </Button>
        </div>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default AddTestnetToken;
