import { AccountIcon, AccountName } from '@/client/components/account';
import AccountSheet from '@/client/components/account-sheet/account-sheet';
import { Dialog, DialogFooter } from '@/client/components/ui';
import { Button } from '@/client/components/ui/button';
import useAccountSheetStore from '@/client/hooks/use-account-sheet-store';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { Clock, Shield, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supportedEVMChains } from '@/background/constants/supported-chains';
import { supportedTestnetChains } from '@/background/constants/supported-testnet-chains';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import useDevModeStore from '@/client/hooks/use-dev-mode';
import useInit from '@/client/hooks/use-init';
import { createRoot } from 'react-dom/client';

export const UnsupportedChainScreen = () => {
  useInit();
  const { activeAccount } = useWalletStore();
  const [chainId, setChainId] = useState<string>('');
  const [loading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(30); // 30 seconds
  const { open: openAccountSheet } = useAccountSheetStore();

  // Network settings and dev mode
  const { networks } = useNetworkSettingsStore();
  const { isDevMode } = useDevModeStore();

  // Map chainId to client slug
  const CHAIN_ID_TO_SLUG = useMemo(
    () =>
      ({
        '0x1': 'ethereum',
        '0xa4b1': 'arbitrum',
        '0x2105': 'base',
        '0x3e7': 'hyperevm',
        // testnet mapping
        '0x3e6': 'hyperevm',
      }) as const,
    []
  );

  const activeNetworkSlugs = useMemo(
    () =>
      Object.values(networks)
        .filter(n => n.isActive)
        .map(n => n.id),
    [networks]
  );

  const displayedChains = useMemo(() => {
    const source = isDevMode ? supportedTestnetChains : supportedEVMChains;
    return Object.values(source).filter(chain => {
      const slug =
        CHAIN_ID_TO_SLUG[chain.chainId as keyof typeof CHAIN_ID_TO_SLUG];
      return activeNetworkSlugs.includes(slug);
    });
  }, [isDevMode, networks]);

  const sortedChains = useMemo(() => {
    const ordered = [...displayedChains];
    ordered.sort((a, b) => {
      const slugA =
        CHAIN_ID_TO_SLUG[a.chainId as keyof typeof CHAIN_ID_TO_SLUG];
      const slugB =
        CHAIN_ID_TO_SLUG[b.chainId as keyof typeof CHAIN_ID_TO_SLUG];
      if (slugA === 'hyperevm' && slugB !== 'hyperevm') return -1;
      if (slugB === 'hyperevm' && slugA !== 'hyperevm') return 1;
      return 0;
    });
    return ordered;
  }, [displayedChains]);

  useEffect(() => {
    // Get chainId from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('chainId');
    if (id) setChainId(id);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClose = () => window.close();

  return (
    <main className="bg-[var(--background-color)] flex flex-col h-screen">
      <Dialog />
      <AccountSheet />

      <div className="p-3 flex items-center justify-between border-b border-white/10">
        <div
          className="flex items-center gap-2 pr-3 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
          onClick={openAccountSheet}
        >
          <div className="size-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
            <AccountIcon icon={activeAccount?.icon} alt="Account" />
          </div>
          <AccountName name={activeAccount?.name} />
        </div>
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Unsupported Chain</h1>
            <p className="text-sm text-white/60">
              Chain ID: {chainId || 'Unknown'}
            </p>
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${timeLeft <= 10 ? 'text-red-400' : 'text-white/60'}`}
          >
            <Clock className="size-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-[var(--primary-color)]/20 border border-[var(--primary-color)]/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-5 text-[var(--primary-color)]" />
            <span className="text-base font-medium">
              This chain is not supported
            </span>
          </div>
          <ul className="text-base text-white/80 space-y-1">
            <li>• The dApp requested a chain not supported by Purro</li>
            <li>
              • Please choose a supported network on the site or close this
              window
            </li>
          </ul>
        </div>

        <div className="mt-4">
          <p className="text-base font-medium text-white/80 mb-2">
            {isDevMode ? 'Testnet Networks' : 'Supported Networks'}
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            {sortedChains.map(chain => (
              <span
                key={chain.chainId}
                className="px-2 py-1 rounded bg-white/10 text-white/80 text-sm inline-flex items-center gap-2"
              >
                <img
                  src={chain.logo}
                  alt={chain.chainName}
                  className="size-4 rounded-full"
                />
                <span className="whitespace-nowrap">
                  {chain.chainName} ({chain.chainId})
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="flex-col gap-2">
        <div className="text-sm text-white/60 text-center">
          Switch to a supported chain to continue
          <br />
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={handleClose}
            disabled={loading}
            className="bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 w-full"
          >
            <X className="size-4" />
            Close
          </Button>
        </div>
      </DialogFooter>
    </main>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<UnsupportedChainScreen />);
}
