import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ethereumLogo,
  hyperliquidLogo,
  arbitrumLogo,
  baseLogo,
} from '@/assets/logo';
import { truncateAddress } from '@/client/utils/formatters';
// import solanaLogo from "@/assets/solana-sol-logo.png";
// import suiLogo from "@/assets/sui-white-logo.png";

interface WalletAddress {
  chain: string;
  name: string;
  address: string;
  icon: string;
}

interface WalletAddressesSimpleProps {
  wallets: {
    ethereum: {
      address: string;
      publicKey: string;
    };
    solana: {
      publicKey: string;
    };
    sui: {
      publicKey: string;
    };
  };
  className?: string;
}

const WalletAddressesSimple = ({
  wallets,
  className,
}: WalletAddressesSimpleProps) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Prepare wallet addresses data
  const walletAddresses: WalletAddress[] = [
    {
      chain: 'hyperliquid',
      name: 'Hyperliquid',
      address: wallets.ethereum.address,
      icon: hyperliquidLogo,
    },
    {
      chain: 'ethereum',
      name: 'Ethereum',
      address: wallets.ethereum.address,
      icon: ethereumLogo,
    },
    {
      chain: 'arbitrum',
      name: 'Arbitrum',
      address: wallets.ethereum.address,
      icon: arbitrumLogo,
    },
    {
      chain: 'base',
      name: 'Base',
      address: wallets.ethereum.address,
      icon: baseLogo,
    },
    // {
    //   chain: "solana",
    //   name: "Solana",
    //   address: wallets.solana.publicKey,
    //   icon: solanaLogo,
    // },
    // {
    //   chain: "sui",
    //   name: "Sui",
    //   address: wallets.sui.publicKey,
    //   icon: suiLogo,
    // },
  ].filter(wallet => wallet.address && wallet.address.trim() !== '');

  const handleCopyAddress = async (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  return (
    <div className={`space-y-1 ${className || ''}`}>
      {walletAddresses.length > 0 &&
        walletAddresses.map(wallet => (
          <div
            key={wallet.chain}
            className="flex items-center justify-between p-2 bg-white/5 rounded text-xs"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <img
                src={wallet.icon}
                alt={wallet.name}
                className="size-4 flex-shrink-0 object-contain"
              />
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--text-color)]">
                  {wallet.name}
                </p>
              </div>
            </div>
            <button
              onClick={e => handleCopyAddress(wallet.address, e)}
              className="ml-1 p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0 flex items-center gap-2 cursor-pointer"
              title="Copy address"
            >
              <p className="text-xs text-[var(--text-color)]/60 font-mono truncate">
                {truncateAddress(wallet.address)}
              </p>
              {copiedAddress === wallet.address ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                  }}
                >
                  <Check className="size-4 text-green-500" />
                </motion.div>
              ) : (
                <Copy className="size-4 text-[var(--text-color)]/60" />
              )}
            </button>
          </div>
        ))}
    </div>
  );
};

export default WalletAddressesSimple;
