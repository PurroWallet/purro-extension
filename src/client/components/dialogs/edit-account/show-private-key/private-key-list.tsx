import useWalletStore from '@/client/hooks/use-wallet-store';
import useEditAccountStore from '@/client/hooks/use-edit-account-store';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import {
  ethereumLogo,
  hyperliquidLogo,
  arbitrumLogo,
  baseLogo,
} from '@/assets/logo';
import { truncateAddress } from '@/client/utils/formatters';

// List of chains that share the same private key (EVM-based)
const SUPPORTED_CHAINS = [
  {
    storageKey: 'eip155',
    name: 'Hyperliquid',
    icon: hyperliquidLogo,
    chainId: 0,
  },
  {
    storageKey: 'eip155',
    name: 'Ethereum',
    icon: ethereumLogo,
    chainId: 1,
  },
  {
    storageKey: 'eip155',
    name: 'Arbitrum',
    icon: arbitrumLogo,
    chainId: 42161,
  },
  {
    storageKey: 'eip155',
    name: 'Base',
    icon: baseLogo,
    chainId: 8453,
  },
];

const PrivateKeyList = ({
  onBack,
  onChooseChain,
}: {
  onBack: () => void;
  onChooseChain: (chainStorageKey: string) => void;
}) => {
  const { wallets } = useWalletStore();
  const { selectedAccountId } = useEditAccountStore();

  const wallet = selectedAccountId ? wallets[selectedAccountId] : undefined;

  // Build list of chains compatible with this private key
  const addressList = wallet
    ? SUPPORTED_CHAINS.flatMap(chain => {
        const walletData = wallet[chain.storageKey as keyof typeof wallet] as
          | { address: string }
          | null
          | undefined;

        if (!walletData || !walletData.address) return [];

        return [
          {
            storageKey: chain.storageKey,
            chain: chain.name,
            name: chain.name,
            address: walletData.address,
            icon: chain.icon,
            chainId: chain.chainId,
          },
        ];
      })
    : [];

  return (
    <DialogWrapper>
      <DialogHeader title="Your Addresses" onClose={onBack} />
      <DialogContent>
        <div className="flex flex-col gap-2">
          {addressList.map((item, index) => (
            <div
              key={`${item.chain}-${item.chainId}-${index}`}
              className="flex items-center justify-between px-3 py-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200 cursor-pointer"
              onClick={() => onChooseChain(item.storageKey)}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0 ">
                <img
                  src={item.icon}
                  alt={item.name || 'Chain'}
                  className="size-6 flex-shrink-0 object-contain"
                />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-base font-medium text-[var(--text-color)]">
                    {item.name}
                  </p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-color)]/60 font-mono truncate">
                {truncateAddress(item.address)}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};

export default PrivateKeyList;
