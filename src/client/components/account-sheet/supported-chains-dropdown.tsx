import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/client/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supportedEVMChains } from '@/background/constants/supported-chains';
import { supportedTestnetChains } from '@/background/constants/supported-testnet-chains';
import { hyperliquidLogo } from '@/assets/logo';
import useNetworkSettingsStore from '@/client/hooks/use-network-store';
import useDevModeStore from '@/client/hooks/use-dev-mode';
import { ChainTypeClient } from '@/types/wallet';

interface SupportedChainsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const SupportedChainsDropdown = ({
  isOpen,
  onToggle,
  className,
}: SupportedChainsDropdownProps) => {
  // Currently selected chainId (hex string) – default to Ethereum Mainnet (value unused, only setter kept)
   
  const [, setSelectedChain] = useState<string>('0x1');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Access active networks from global settings store and dev mode
  const { networks } = useNetworkSettingsStore();
  const { isDevMode } = useDevModeStore();

  // Build an array of active network slugs (e.g. 'ethereum', 'base', ...)
  const activeNetworkSlugs = useMemo<ChainTypeClient[]>(
    () =>
      Object.values(networks)
        .filter(n => n.isActive)
        .map(n => n.id),
    [networks]
  );

  // Mapping between EVM hex chainIds and our internal slugs
  const CHAIN_ID_TO_SLUG: Record<string, ChainTypeClient> = {
    // Mainnet chains
    '0x1': 'ethereum',
    '0xa4b1': 'arbitrum',
    '0x2105': 'base',
    '0x3e7': 'hyperevm',
    // Testnet chains
    '0x3e6': 'hyperevm', // HyperEVM Testnet uses same slug as mainnet
  } as const;

  const handleChainSelect = (chainId: string) => {
    setSelectedChain(chainId);
    onToggle(); // Close dropdown after selection
  };

  // Filter supported chains based on dev mode and active network slugs
  const displayedChains = useMemo(() => {
    // Choose chain source based on dev mode
    const chainSource = isDevMode ? supportedTestnetChains : supportedEVMChains;

    return Object.values(chainSource).filter(chain => {
      const slug = CHAIN_ID_TO_SLUG[chain.chainId];
      return activeNetworkSlugs.includes(slug);
    });
  }, [activeNetworkSlugs, isDevMode]);

  // Build ordered list of chains (HyperEVM first)
  const sortedChains = useMemo(() => {
    const ordered = [...displayedChains];
    ordered.sort((a, b) => {
      const slugA = CHAIN_ID_TO_SLUG[a.chainId];
      const slugB = CHAIN_ID_TO_SLUG[b.chainId];
      if (slugA === 'hyperevm' && slugB !== 'hyperevm') return -1;
      if (slugB === 'hyperevm' && slugA !== 'hyperevm') return 1;
      return 0;
    });
    return ordered;
  }, [displayedChains]);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 280; // min-w-[280px]
      const dropdownHeight = 240; // max-h-60 (240px)

      let top = buttonRect.bottom + 8; // 8px gap below button
      let left = buttonRect.left;

      // Adjust if dropdown would go off-screen horizontally
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 8; // 8px margin from edge
      }

      // Adjust if dropdown would go off-screen vertically
      if (top + dropdownHeight > window.innerHeight) {
        top = buttonRect.top - dropdownHeight - 8; // Show above button instead
      }

      setDropdownPosition({ top, left });
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Chain Dropdown Button */}
      <button
        ref={buttonRef}
        className={cn(
          'h-8 px-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer',
          className
        )}
        onClick={onToggle}
      >
        <div className="flex items-center -space-x-2">
          {sortedChains.length > 0 ? (
            sortedChains.map((chain, idx) => (
              <img
                key={chain.chainId}
                src={chain.logo}
                alt={chain.chainName}
                className="size-5 rounded-full"
                style={{ zIndex: sortedChains.length - idx }}
              />
            ))
          ) : (
            <img src={hyperliquidLogo} alt="Hyperliquid" className="size-5" />
          )}
        </div>
      </button>

      {/* Dropdown Menu - Using Portal to render outside overflow container */}
      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed bg-[var(--background-color)] border border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[280px] w-max z-[9999]"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
            >
              <p className="p-2 text-sm font-medium text-[var(--text-color)] border-b border-white/10">
                {isDevMode ? 'Testnet Chains' : 'Supported Chains'}
              </p>
              {sortedChains.map(chain => (
                <button
                  key={chain.chainId}
                  onClick={() => handleChainSelect(chain.chainId)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors first:rounded-t-lg last:rounded-b-lg whitespace-nowrap cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={chain.logo}
                      alt={chain.chainName}
                      className="size-5"
                    />

                    <div className="text-left">
                      <p className="text-sm font-medium text-[var(--text-color)]">
                        {chain.chainName}
                      </p>
                      {/* <p className="text-xs text-[var(--text-color)]/60">
                        {chain.symbol}
                      </p> */}
                    </div>
                  </div>
                  {/* Tick icon removed as per requirement */}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default SupportedChainsDropdown;
