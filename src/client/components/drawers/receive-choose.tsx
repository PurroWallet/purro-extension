import { Button } from '../ui';
import {
  arbitrumLogo,
  baseLogo,
  ethereumLogo,
  hyperliquidLogo,
  hyperliquidLogoDark,
} from '@/assets/logo';
import { QRCodeCanvas } from 'qrcode.react';

import { truncateAddress } from '@/client/utils/formatters';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import {
  ArrowLeftIcon,
  CopyIcon,
  QrCodeIcon,
  CheckIcon,
  DownloadIcon,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { ChainType } from '@/client/types/wallet';

interface ChainOption {
  id: ChainType;
  name: string;
  logo: string;
}

const chainOptions: ChainOption[] = [
  {
    id: 'hyperevm',
    name: 'HyperEVM',
    logo: hyperliquidLogo,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    logo: ethereumLogo,
  },
  {
    id: 'base',
    name: 'Base',
    logo: baseLogo,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    logo: arbitrumLogo,
  },
];

const ChainOptionItem = ({
  option,
  address,
  onClick,
}: {
  option: ChainOption;
  address: string;
  onClick: (chainId: ChainType) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-between border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40">
      <div className="flex items-center gap-3">
        <img src={option.logo} alt={option.name} className="size-8" />
        <div className="flex flex-col">
          <p className="text-base font-semibold">{option.name}</p>
          <p className="text-sm text-white/60">{truncateAddress(address)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="bg-[var(--primary-color-light)] border border-[var(--primary-color-light)]/30 rounded-lg p-2 cursor-pointer hover:bg-[var(--primary-color-light)]/80 transition-colors"
          onClick={() => onClick(option.id)}
        >
          <QrCodeIcon className="size-5 text-[var(--primary-color)]" />
        </div>
        <div
          className="bg-[var(--primary-color-light)] border border-[var(--primary-color-light)]/30 rounded-lg p-2 cursor-pointer hover:bg-[var(--primary-color-light)]/80 transition-colors"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckIcon className="size-5 text-[var(--primary-color)]" />
          ) : (
            <CopyIcon className="size-5 text-[var(--primary-color)]" />
          )}
        </div>
      </div>
    </div>
  );
};

export const ReceiveChooseDrawer = () => {
  const [selectedChain, setSelectedChain] = useState<ChainType | null>(null);
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const { isNetworkActive } = useNetworkSettingsStore();

  // Filter chain options to only show active networks
  const activeChainOptions = chainOptions.filter(option =>
    isNetworkActive(option.id as any)
  );

  if (selectedChain) {
    return (
      <ReceiveAddress
        chain={selectedChain}
        address={activeAccount?.eip155?.address || ''}
        back={() => setSelectedChain(null)}
      />
    );
  }

  return (
    <div className="p-4 h-full">
      <div className="flex flex-col gap-2 h-full">
        {/* Header */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-center">Receive</h1>
          <p className="text-sm text-gray-500 text-center">
            Choose a network to receive funds
          </p>
        </div>

        {/* Chain Options */}
        <div className="flex flex-col gap-2 flex-1">
          {activeChainOptions.map(option => (
            <ChainOptionItem
              key={option.id}
              option={option}
              address={activeAccount?.eip155?.address || ''}
              onClick={setSelectedChain}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ReceiveAddress = ({
  address,
  chain,
  back,
}: {
  address: string;
  chain: ChainType;
  back: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSaveQR = async () => {
    try {
      const canvas = qrRef.current;
      if (!canvas) return;

      // Convert canvas to blob
      canvas.toBlob(blob => {
        if (!blob) return;

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${getChainName(chain)}-address-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to save QR code:', err);
    }
  };

  const getChainName = (chain: string) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4  w-full">
        <button
          onClick={back}
          className={`p-2 rounded-full hover:bg-gray-600/80 size-8 transition-all cursor-pointer`}
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <h1 className="text-xl font-semibold">Receive Address</h1>
        <div className="size-8" />
      </div>

      {/* QR Code Section */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <QRCodeCanvas
            value={address}
            size={200}
            level={'L'}
            ref={qrRef}
            imageSettings={{
              src:
                chain === 'hyperevm'
                  ? hyperliquidLogoDark
                  : chain === 'ethereum'
                    ? ethereumLogo
                    : chain === 'base'
                      ? baseLogo
                      : arbitrumLogo,
              x: undefined,
              y: undefined,
              height: 32,
              width: 32,
              opacity: 1,
              excavate: true,
            }}
          />
        </div>

        {/* Address Display */}
        <div className="w-full max-w-sm">
          <div className="bg-[var(--primary-color)]/60 rounded-lg p-4 border border-[var(--primary-color)]/20">
            <p className="text-xs text-white/60 mb-1">
              Your {getChainName(chain)} Address
            </p>
            <p className="text-sm font-mono break-all">{address}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex gap-2">
        <Button onClick={handleCopy} disabled={copied} className="flex-1">
          <CopyIcon className="size-4" />
          {copied ? 'Copied!' : 'Copy Address'}
        </Button>

        <Button onClick={handleSaveQR} disabled={saved} className="flex-1">
          <DownloadIcon className="size-4" />
          {saved ? 'Saved!' : 'Save QR'}
        </Button>
      </div>
    </div>
  );
};
