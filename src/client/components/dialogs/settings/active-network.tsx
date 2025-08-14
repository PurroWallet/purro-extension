import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui/dialog';
import { Switch } from '@/client/components/ui/switch';
import { cn } from '@/client/lib/utils';
import useNetworkSettingsStore, {
  NetworkConfig,
} from '@/client/hooks/use-network-store';
import { RefreshCcw, TrendingUp } from 'lucide-react';
import { ChainTypeClient } from '@/types/wallet';
import { getNetworkIcon } from '@/client/utils/icons';

const ActiveNetwork = ({ onBack }: { onBack: () => void }) => {
  const {
    networks,
    toggleNetwork,
    resetToDefaults,
    isHyperliquidDexEnabled,
    toggleHyperliquidDex,
  } = useNetworkSettingsStore();

  const handleToggleNetwork = (networkId: ChainTypeClient) => {
    toggleNetwork(networkId);
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Active Network"
        onClose={onBack}
        rightContent={
          <button
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            onClick={resetToDefaults}
          >
            <RefreshCcw className="size-4" />
          </button>
        }
      />
      <DialogContent>
        {/* Hyperliquid DEX Toggle */}
        <div className="flex items-center justify-between p-3 border border-white/10 rounded-lg bg-white/5">
          <div className="flex items-center gap-3">
            <div className="size-8 flex items-center justify-center rounded-full bg-green-500/20">
              <TrendingUp className="size-4 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white text-base">
                Hyperliquid DEX
              </p>
              <p className="text-xs text-muted-foreground">
                Spot & Perpetuals Trading
              </p>
            </div>
          </div>
          <Switch
            checked={isHyperliquidDexEnabled}
            onCheckedChange={toggleHyperliquidDex}
          />
        </div>

        {/* Regular Network Toggles */}
        {Object.values(networks).map(network => (
          <NetworkToggleItem
            key={network.id}
            network={network}
            onToggle={() => handleToggleNetwork(network.id)}
          />
        ))}
      </DialogContent>
    </DialogWrapper>
  );
};

interface NetworkToggleItemProps {
  network: NetworkConfig;
  onToggle: () => void;
}

const NetworkToggleItem = ({ network, onToggle }: NetworkToggleItemProps) => {
  const isDisabled = network.isRequired && network.isActive;

  return (
    <div className="flex items-center justify-between p-3 border border-white/10 rounded-lg bg-white/5">
      <div className="flex items-center gap-3">
        {/* Network Icon */}
        <img
          src={getNetworkIcon(network.id)}
          alt={network.name}
          className="size-8"
          onError={e => {
            console.error(
              `Failed to load icon for ${network.name}:`,
              network.icon
            );
            console.error('Error:', e);
          }}
        />

        <div>
          <p className="font-medium text-white text-base">{network.name}</p>
          {network.id === 'hyperevm' && (
            <p className="text-xs text-muted-foreground">EVM Tokens Only</p>
          )}
        </div>
      </div>

      <Switch
        checked={network.isActive}
        onCheckedChange={onToggle}
        disabled={isDisabled}
        className={cn(isDisabled && 'opacity-50 cursor-not-allowed')}
      />
    </div>
  );
};

export default ActiveNetwork;
