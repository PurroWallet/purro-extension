// Injected Provider Bundle - Uses new provider architecture
import { PurroEVMProvider } from './evm-provider';
import { PurroProviderManager } from './provider-manager';
import { purroIcon } from '../utils/purro-icon';

// EIP-6963 Provider Discovery
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

interface EIP6963RequestProviderEvent extends CustomEvent {
  type: 'eip6963:requestProvider';
}

class EIP6963Provider {
  private providerInfo: EIP6963ProviderInfo;
  private provider: any;

  constructor(provider: any) {
    this.provider = provider;
    this.providerInfo = {
      uuid: crypto.randomUUID(),
      name: 'Purro',
      icon: this.getIconDataUri(),
      rdns: 'xyz.purro.app',
    };

    this.init();
  }

  private init() {
    window.addEventListener(
      'eip6963:requestProvider',
      this.handleProviderRequest.bind(this) as EventListener
    );

    // Announce immediately
    this.announceProvider();

    // Announce after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.announceProvider();
      });
    } else {
      // DOM is already ready, announce again
      this.announceProvider();
    }

    // Multiple announcements with different delays to catch late listeners
    // This is especially important for Rainbow wallet compatibility
    const delays = [50, 100, 300, 500, 1000, 2000];
    delays.forEach(delay => {
      setTimeout(() => {
        this.announceProvider();
      }, delay);
    });
  }

  private handleProviderRequest(_event: EIP6963RequestProviderEvent) {
    console.log('🟣 Purro: Received EIP-6963 provider request, announcing provider');
    this.announceProvider();
  }

  private announceProvider() {
    const announceEvent = new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: this.providerInfo,
        provider: this.provider,
      },
    }) as EIP6963AnnounceProviderEvent;

    window.dispatchEvent(announceEvent);

    // Debug logging for Rainbow wallet compatibility
    console.log('🟣 Purro: Announced EIP-6963 provider', {
      rdns: this.providerInfo.rdns,
      name: this.providerInfo.name,
      uuid: this.providerInfo.uuid,
      timestamp: new Date().toISOString()
    });
  }

  private getIconDataUri(): string {
    return purroIcon;
  }
}

// Initialize providers

try {
  console.log('🟣 Purro: Initializing wallet providers...');

  const providerManager = new PurroProviderManager();
  const evmProvider = new PurroEVMProvider(providerManager);

  // Log existing providers for debugging
  if ((window as any).ethereum) {
    console.log('🟣 Purro: Existing ethereum provider detected:', {
      isMetaMask: (window as any).ethereum.isMetaMask,
      isRainbow: (window as any).ethereum.isRainbow,
      rdns: (window as any).ethereum.info?.rdns
    });
  }

  // Expose providers to window object
  (window as any).purro = providerManager;

  // Only inject to window.ethereum if no other provider exists
  // This prevents conflicts with other wallets like Rainbow
  if (!(window as any).ethereum) {
    (window as any).ethereum = evmProvider;
    console.log('🟣 Purro: Set as primary ethereum provider');
  } else {
    // If ethereum already exists, add Purro as a property
    if (!(window as any).ethereum.isPurro) {
      (window as any).ethereum.purro = evmProvider;
      console.log('🟣 Purro: Added as secondary provider to existing ethereum object');
    }
  }

  // Initialize EIP-6963 provider with EVM provider
  new EIP6963Provider(evmProvider);
  console.log('🟣 Purro: EIP-6963 provider initialized');

  // Dispatch ready events
  window.dispatchEvent(
    new CustomEvent('purro#initialized', {
      detail: providerManager,
    })
  );

  window.dispatchEvent(
    new CustomEvent('ethereum#initialized', {
      detail: evmProvider,
    })
  );

  console.log('🟣 Purro: All providers initialized successfully');
} catch (error) {
  console.error('❌ Purro: Error initializing providers:', error);
}
