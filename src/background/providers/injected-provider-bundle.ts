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
    type: "eip6963:announceProvider";
    detail: EIP6963ProviderDetail;
}

interface EIP6963RequestProviderEvent extends CustomEvent {
    type: "eip6963:requestProvider";
}

class EIP6963Provider {
    private providerInfo: EIP6963ProviderInfo;
    private provider: any;

    constructor(provider: any) {
        this.provider = provider;
        this.providerInfo = {
            uuid: crypto.randomUUID(),
            name: "Purro",
            icon: this.getIconDataUri(),
            rdns: "xyz.purro.app"
        };

        this.init();
    }

    private init() {
        window.addEventListener("eip6963:requestProvider", this.handleProviderRequest.bind(this) as EventListener);

        this.announceProvider();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.announceProvider();
            });
        }

        setTimeout(() => {
            this.announceProvider();
        }, 100);

        setTimeout(() => {
            this.announceProvider();
        }, 1000);
    }

    private handleProviderRequest(_event: EIP6963RequestProviderEvent) {
        this.announceProvider();
    }

    private announceProvider() {
        const announceEvent = new CustomEvent(
            "eip6963:announceProvider",
            {
                detail: {
                    info: this.providerInfo,
                    provider: this.provider
                }
            }
        ) as EIP6963AnnounceProviderEvent;

        window.dispatchEvent(announceEvent);
    }

    private getIconDataUri(): string {
        return purroIcon;
    }
}

// Initialize providers
console.log('🚀 Initializing Purro providers...');

try {
    const providerManager = new PurroProviderManager();
    console.log('✅ PurroProviderManager created');

    const evmProvider = new PurroEVMProvider(providerManager);
    console.log('✅ PurroEVMProvider created');

    // Expose providers to window object
    (window as any).purro = providerManager;
    (window as any).ethereum = evmProvider;
    console.log('✅ Providers exposed to window object');

    // Initialize EIP-6963 provider with EVM provider
    new EIP6963Provider(evmProvider);
    console.log('✅ EIP-6963 provider initialized');

    // Dispatch ready events
    window.dispatchEvent(new CustomEvent('purro#initialized', {
        detail: providerManager
    }));

    window.dispatchEvent(new CustomEvent('ethereum#initialized', {
        detail: evmProvider
    }));

    console.log('✅ All providers initialized successfully');
} catch (error) {
    console.error('❌ Error initializing providers:', error);
}