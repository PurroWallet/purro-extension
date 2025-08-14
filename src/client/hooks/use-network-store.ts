import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NETWORK_ICONS } from '@/utils/network-icons';
import { ChainTypeClient } from '@/types/wallet';

export interface NetworkConfig {
  id: ChainTypeClient;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  isActive: boolean;
  isRequired?: boolean;
}

interface NetworkSettingsState {
  networks: Record<ChainTypeClient, NetworkConfig>;
  activeNetworks: ChainTypeClient[];

  // Separate setting for Hyperliquid DEX (spot + perps)
  isHyperliquidDexEnabled: boolean;

  // Actions
  toggleNetwork: (networkId: ChainTypeClient) => void;
  setNetworkActive: (networkId: ChainTypeClient, isActive: boolean) => void;
  toggleHyperliquidDex: () => void;
  setHyperliquidDexEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;
  getActiveNetworks: () => NetworkConfig[];
  isNetworkActive: (networkId: ChainTypeClient) => boolean;
}

// Base meta-data per chain – this is small so we keep it co-located. In future this
// can be generated directly from a central `supportedChains` file to avoid duplication.
const DEFAULT_NETWORKS: Record<ChainTypeClient, NetworkConfig> = {
  hyperevm: {
    id: 'hyperevm',
    name: 'HyperEVM',
    symbol: 'HYPE',
    icon: NETWORK_ICONS.hyperevm,
    color: '#10B981', // green-500
    isActive: true,
    // Removed isRequired to allow users to disable Hyperliquid EVM fetching
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: NETWORK_ICONS.ethereum,
    color: '#3B82F6', // blue-500
    isActive: true,
  },
  base: {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    icon: NETWORK_ICONS.base,
    color: '#1D4ED8', // blue-700
    isActive: true,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: NETWORK_ICONS.arbitrum,
    color: '#F97316', // orange-500
    isActive: true,
  },
};

// Helper function to merge with defaults (for migration)
const mergeWithDefaults = (stored: any) => {
  if (!stored)
    return {
      networks: DEFAULT_NETWORKS,
      activeNetworks: Object.keys(DEFAULT_NETWORKS) as ChainTypeClient[],
      isHyperliquidDexEnabled: true,
    };

  // Ensure all default networks exist
  const mergedNetworks = { ...DEFAULT_NETWORKS };
  if (stored.networks) {
    Object.keys(stored.networks).forEach(key => {
      if (mergedNetworks[key as ChainTypeClient]) {
        mergedNetworks[key as ChainTypeClient] = {
          ...mergedNetworks[key as ChainTypeClient],
          ...stored.networks[key],
        };
      }
    });
  }

  return {
    networks: mergedNetworks,
    activeNetworks: Object.keys(mergedNetworks).filter(
      key => mergedNetworks[key as ChainTypeClient].isActive
    ) as ChainTypeClient[],
    isHyperliquidDexEnabled: stored.isHyperliquidDexEnabled ?? true,
  };
};

const useNetworkSettingsStore = create<NetworkSettingsState>()(
  persist(
    (set, get) => ({
      networks: DEFAULT_NETWORKS,
      activeNetworks: Object.keys(DEFAULT_NETWORKS) as ChainTypeClient[],
      isHyperliquidDexEnabled: true, // Default to enabled

      toggleNetwork: (networkId: ChainTypeClient) => {
        const { networks } = get();
        const network = networks[networkId];

        // Don't allow disabling required networks
        if (network.isRequired && network.isActive) {
          console.warn(`Cannot disable required network: ${networkId}`);
          return;
        }

        set(state => {
          const newNetworks = {
            ...state.networks,
            [networkId]: {
              ...state.networks[networkId],
              isActive: !state.networks[networkId].isActive,
            },
          };

          const newActiveNetworks = (
            Object.values(newNetworks) as NetworkConfig[]
          )
            .filter(network => network.isActive)
            .map(network => network.id);

          return {
            networks: newNetworks,
            activeNetworks: newActiveNetworks,
          };
        });
      },

      toggleHyperliquidDex: () => {
        set(state => ({
          isHyperliquidDexEnabled: !state.isHyperliquidDexEnabled,
        }));
      },

      setHyperliquidDexEnabled: (enabled: boolean) => {
        set({ isHyperliquidDexEnabled: enabled });
      },

      setNetworkActive: (networkId: ChainTypeClient, isActive: boolean) => {
        const { networks } = get();
        const network = networks[networkId];

        // Don't allow disabling required networks
        if (network.isRequired && !isActive) {
          console.warn(`Cannot disable required network: ${networkId}`);
          return;
        }

        set(state => {
          const newNetworks = {
            ...state.networks,
            [networkId]: {
              ...state.networks[networkId],
              isActive,
            },
          };

          const newActiveNetworks = (
            Object.values(newNetworks) as NetworkConfig[]
          )
            .filter(network => network.isActive)
            .map(network => network.id);

          return {
            networks: newNetworks,
            activeNetworks: newActiveNetworks,
          };
        });
      },

      resetToDefaults: () => {
        set({
          networks: DEFAULT_NETWORKS,
          activeNetworks: Object.keys(DEFAULT_NETWORKS) as ChainTypeClient[],
          isHyperliquidDexEnabled: true,
        });
      },

      getActiveNetworks: () => {
        const { networks } = get();
        return Object.values(networks).filter(network => network.isActive);
      },

      isNetworkActive: (networkId: ChainTypeClient) => {
        const { networks } = get();
        return networks[networkId]?.isActive || false;
      },
    }),
    {
      name: 'network-settings-storage',
      version: 3, // Increment version to handle hyperevm migration
      migrate: (persistedState: any, version: number) => {
        console.log(
          '🔄 Migrating network settings from version',
          version,
          'to 3'
        );
        const migrated = mergeWithDefaults(persistedState);
        console.log('✅ Migration result:', migrated);
        return migrated;
      },
    }
  )
);

export default useNetworkSettingsStore;
