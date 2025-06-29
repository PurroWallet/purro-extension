import { PurroEVMProvider } from './evm-provider';
import { ChainType } from '../types/account';

export interface ProviderManager {
    getProvider(chainType: ChainType): any;
    isProviderSupported(chainType: ChainType): boolean;
    getAllProviders(): Record<ChainType, any>;
}

export class PurroProviderManager implements ProviderManager {
    private providers: Map<ChainType, any> = new Map();

    constructor() {
        this.initializeProviders();
    }

    private initializeProviders() {
        // Initialize EVM provider
        const evmProvider = new PurroEVMProvider();
        this.providers.set('eip155', evmProvider);

        // TODO: Initialize other providers
        // this.providers.set('solana', new PurroSolanaProvider());
        // this.providers.set('sui', new PurroSuiProvider());
    }

    getProvider(chainType: ChainType): any {
        const provider = this.providers.get(chainType);
        if (!provider) {
            throw new Error(`Provider for chain type ${chainType} not found`);
        }
        return provider;
    }

    isProviderSupported(chainType: ChainType): boolean {
        return this.providers.has(chainType);
    }

    getAllProviders(): Record<ChainType, any> {
        const result = {} as Record<ChainType, any>;

        for (const [chainType, provider] of this.providers.entries()) {
            result[chainType] = provider;
        }

        return result;
    }

    // Get EVM provider specifically
    getEVMProvider(): PurroEVMProvider {
        return this.getProvider('eip155') as PurroEVMProvider;
    }

    // Handle provider events
    handleProviderEvent(chainType: ChainType, event: string, data: any) {
        const provider = this.providers.get(chainType);
        if (provider && typeof provider.emit === 'function') {
            provider.emit(event, data);
        }
    }

    // Update provider state
    updateProviderState(chainType: ChainType, state: any) {
        const provider = this.providers.get(chainType);
        if (provider && typeof provider.updateState === 'function') {
            provider.updateState(state);
        }
    }
}

// Singleton instance
export const providerManager = new PurroProviderManager(); 