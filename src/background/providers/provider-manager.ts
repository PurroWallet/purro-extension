import { purroIcon } from '../utils/purro-icon';
import { PurroEVMProvider } from './evm-provider';

// Core Provider Interface
export interface PurroProvider {
    isConnected: boolean;
    accounts: string[];
    activeAccount: string | null;

    connect(): Promise<{ accounts: string[]; activeAccount: string | null }>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<string[]>;
    switchAccount(address: string): Promise<void>;
    signTransaction(transactionData: any): Promise<string>;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    isUnlocked(): Promise<boolean>;
}

// EIP-6963 Provider Implementation
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

// Main Provider Manager
export class PurroProviderManager implements PurroProvider {
    public isConnected: boolean = false;
    public accounts: string[] = [];
    public activeAccount: string | null = null;

    private eventListeners: Map<string, Function[]> = new Map();
    private requestId: number = 0;
    private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

    // Cache for getAccounts to avoid redundant API calls
    private accountsCache: string[] | null = null;
    private accountsCacheTimestamp: number = 0;
    private readonly ACCOUNTS_CACHE_TTL = 5000; // 5 seconds cache

    constructor() {
        console.log('🚀 Creating PurroProviderManager for origin:', window.location.origin);
        this.init();
    }

    private init() {
        // Listen for messages from content script
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data.source !== 'purro-content-script') return;

            const { type, requestId, response } = event.data;

            if (type === 'RESPONSE' && requestId) {
                // Handle response to a pending request
                const pendingRequest = this.pendingRequests.get(requestId);
                if (pendingRequest) {
                    this.pendingRequests.delete(requestId);
                    if (response.success) {
                        pendingRequest.resolve(response.data);
                    } else {
                        pendingRequest.reject(new Error(response.error || 'Request failed'));
                    }
                }
            }

            // Handle wallet state changes
            if (type === 'WALLET_UNLOCKED') {
                this.emit('walletUnlocked');
            }

            if (type === 'ACCOUNTS_CHANGED') {
                const newAccounts = event.data.accounts || [];

                // Update internal state
                this.accounts = newAccounts;
                this.activeAccount = newAccounts[0] || null;

                // Update connection status
                if (newAccounts.length === 0) {
                    this.isConnected = false;
                }

                // Invalidate accounts cache
                this.accountsCache = null;
                this.accountsCacheTimestamp = 0;

                // Emit accountsChanged event to dApp
                this.emit('accountsChanged', newAccounts);

                // Also emit accountChanged for single account
                if (this.activeAccount) {
                    this.emit('accountChanged', this.activeAccount);
                } else {
                    this.emit('accountChanged', null);
                }
            }
        });

        // Initialize connection state immediately and with retries
        setTimeout(() => {
            console.log('⏰ Starting connection state initialization...');
            this.initializeConnectionState();
        }, 50);
    }

    // Initialize connection state with better error handling
    private async initializeConnectionState() {
        try {
            console.log('🔄 Initializing connection state for origin:', window.location.origin);

            // Check if already connected to this site (cached)
            const connectedAccountForSite = await this.getConnectedAccountForSite();

            if (connectedAccountForSite && connectedAccountForSite.address) {
                // Site is connected - set up state immediately
                this.isConnected = true;
                this.accounts = [connectedAccountForSite.address];
                this.activeAccount = connectedAccountForSite.address;

                // Update cache
                this.accountsCache = this.accounts;
                this.accountsCacheTimestamp = Date.now();

                console.log('🔗 Provider initialized with connected account:', connectedAccountForSite.address);

                // Emit events to notify dApp with a small delay to ensure listeners are ready
                setTimeout(() => {
                    this.emit('connect', { accounts: this.accounts, activeAccount: this.activeAccount });
                    this.emit('accountsChanged', this.accounts);
                    console.log('📢 Provider events emitted for connected account');
                }, 150);

            } else {
                // Not connected - ensure clean state
                this.isConnected = false;
                this.accounts = [];
                this.activeAccount = null;
                this.accountsCache = null;
                this.accountsCacheTimestamp = 0;

                console.log('🔌 Provider initialized - not connected to this site');

                // Still emit accountsChanged with empty array to let dApp know we're ready
                setTimeout(() => {
                    this.emit('accountsChanged', []);
                    console.log('📢 Provider events emitted - no connection');
                }, 150);
            }
        } catch (error) {
            console.error('❌ Error initializing connection state:', error);
            // On error, assume not connected but still notify dApp
            this.isConnected = false;
            this.accounts = [];
            this.activeAccount = null;
            this.accountsCache = null;
            this.accountsCacheTimestamp = 0;

            // Emit empty accountsChanged to let dApp know we're ready (but not connected)
            setTimeout(() => {
                this.emit('accountsChanged', []);
                console.log('📢 Provider events emitted - error state');
            }, 150);
        }
    }

    // Simplified method to refresh connection state
    private async refreshConnectionState() {
        try {
            const connectedAccountForSite = await this.getConnectedAccountForSite();

            if (connectedAccountForSite && connectedAccountForSite.address) {
                this.isConnected = true;
                this.accounts = [connectedAccountForSite.address];
                this.activeAccount = connectedAccountForSite.address;
                this.accountsCache = this.accounts;
                this.accountsCacheTimestamp = Date.now();
            } else {
                this.isConnected = false;
                this.accounts = [];
                this.activeAccount = null;
                this.accountsCache = null;
                this.accountsCacheTimestamp = 0;
            }
        } catch (error) {
            console.error('Error refreshing connection state:', error);
            this.isConnected = false;
            this.accounts = [];
            this.activeAccount = null;
            this.accountsCache = null;
            this.accountsCacheTimestamp = 0;
        }
    }

    private async getConnectedAccountForSite(): Promise<any> {
        try {
            const result = await chrome.storage.local.get(['connectedSites']);
            const connectedSites = result.connectedSites || {};
            const currentSite = connectedSites[window.location.origin];

            if (currentSite && currentSite.address) {
                return { address: currentSite.address };
            }

            return null;
        } catch (error) {
            console.error('Error getting connected account for site:', error);
            return null;
        }
    }

    private generateRequestId(): string {
        return `${Date.now()}-${++this.requestId}`;
    }

    // Message handling
    public sendMessage(type: string, data?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const requestId = this.generateRequestId();
            console.log(`📤 ProviderManager sending message: ${type} with requestId: ${requestId}`);

            this.pendingRequests.set(requestId, { resolve, reject });

            const message = {
                source: 'purro-provider',
                type,
                data,
                requestId
            };

            console.log(`  - message payload:`, message);
            window.postMessage(message, '*');

            // Increase timeout to match signing/connect timeout (10 minutes)
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    console.error(`❌ Request timeout for ${type} with requestId: ${requestId}`);
                    reject(new Error('Request timeout - Please try again'));
                }
            }, 10 * 60 * 1000); // 10 minutes
        });
    }

    // Core provider methods
    async connect(): Promise<{ accounts: string[]; activeAccount: string | null }> {
        try {
            console.log('🔗 ProviderManager.connect() called for origin:', window.location.origin);

            // First check if already connected
            console.log('  - checking connection status...');
            const connectionStatus = await this.sendMessage('CHECK_CONNECTION_STATUS', {
                origin: window.location.origin
            });
            console.log('  - connection status:', connectionStatus);

            if (connectionStatus) {
                // Already connected - get the connected accounts
                const accounts = await this.getAccounts();

                this.isConnected = true;
                this.accounts = accounts;
                this.activeAccount = accounts[0] || null;

                this.emit('connect', { accounts: this.accounts, activeAccount: this.activeAccount });
                this.emit('accountsChanged', this.accounts);

                return {
                    accounts: this.accounts,
                    activeAccount: this.activeAccount
                };
            }

            // Not connected yet - proceed with normal connection flow
            console.log('  - not connected, sending CONNECT_WALLET message...');
            const result = await this.sendMessage('CONNECT_WALLET');
            console.log('  - received result from CONNECT_WALLET:', result);

            this.isConnected = true;

            // Handle response format consistently
            let connectionData;
            if (result && typeof result === 'object') {
                if (result.data && typeof result.data === 'object') {
                    connectionData = result.data;
                } else {
                    connectionData = result;
                }
            } else {
                throw new Error('Invalid connection response format');
            }

            this.accounts = connectionData.accounts || [];
            this.activeAccount = connectionData.activeAccount || null;

            // Invalidate caches since we have new connection
            this.accountsCache = null;
            this.accountsCacheTimestamp = 0;

            this.emit('connect', { accounts: this.accounts, activeAccount: this.activeAccount });
            this.emit('accountsChanged', this.accounts);

            return {
                accounts: this.accounts,
                activeAccount: this.activeAccount
            };
        } catch (error) {
            console.error('❌ ProviderManager.connect() error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            console.log('🔌 ProviderManager.disconnect() called for origin:', window.location.origin);

            await this.sendMessage('DISCONNECT_WALLET');

            this.isConnected = false;
            this.accounts = [];
            this.activeAccount = null;

            // Clear caches
            this.accountsCache = null;
            this.accountsCacheTimestamp = 0;

            this.emit('disconnect');
            this.emit('accountsChanged', []);

            console.log('✅ ProviderManager disconnected successfully');
        } catch (error) {
            console.error('❌ ProviderManager.disconnect() error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async getAccounts(): Promise<string[]> {
        try {
            const connectedAccountForSite = await this.getConnectedAccountForSite();

            if (connectedAccountForSite && connectedAccountForSite.address) {
                this.isConnected = true;
                this.accounts = [connectedAccountForSite.address];
                this.activeAccount = connectedAccountForSite.address;
                this.accountsCache = this.accounts;
                this.accountsCacheTimestamp = Date.now();

                return this.accounts;
            }
        } catch (error) {
            // Silent fail
        }

        if (!this.isConnected) {
            return [];
        }

        // If we have cached accounts and they're recent, return them
        if (this.accountsCache && this.accountsCacheTimestamp + this.ACCOUNTS_CACHE_TTL > Date.now()) {
            console.log('📦 Returning cached accounts:', this.accountsCache);
            return this.accountsCache;
        }

        // If we have accounts in memory, return them and update cache
        if (this.accounts.length > 0) {
            this.accountsCache = this.accounts;
            this.accountsCacheTimestamp = Date.now();
            console.log('💾 Returning memory accounts:', this.accounts);
            return this.accounts;
        }

        // If no accounts in memory but connected, refresh state
        try {
            console.log('🔄 Refreshing connection state...');
            await this.refreshConnectionState();
            return this.accounts;
        } catch (error) {
            console.error('Error refreshing accounts:', error);
            return [];
        }
    }

    async switchAccount(address: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            await this.sendMessage('SWITCH_ACCOUNT', { address });
            this.activeAccount = address;
            this.emit('accountChanged', address);
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async signTransaction(transactionData: any): Promise<string> {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const password = await this.promptForPassword();
            const result = await this.sendMessage('SIGN_TRANSACTION', {
                transactionData,
                password
            });

            return result.signature;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async isUnlocked(): Promise<boolean> {
        try {
            const state = await this.sendMessage('GET_WALLET_STATE');
            return !state.isLocked;
        } catch (error) {
            return false;
        }
    }

    // Method for dApps to manually trigger auto-connect check
    async checkConnection(): Promise<boolean> {
        await this.refreshConnectionState();

        // If connected, emit events to ensure dApp is notified
        if (this.isConnected && this.accounts.length > 0) {
            setTimeout(() => {
                this.emit('connect', { accounts: this.accounts, activeAccount: this.activeAccount });
                this.emit('accountsChanged', this.accounts);
            }, 10);
        }

        return this.isConnected;
    }

    // Method for dApps to manually request current state
    getCurrentState(): { isConnected: boolean; accounts: string[]; activeAccount: string | null } {
        return {
            isConnected: this.isConnected,
            accounts: [...this.accounts],
            activeAccount: this.activeAccount
        };
    }

    private async promptForPassword(): Promise<string> {
        return new Promise((resolve, reject) => {
            const password = prompt('Enter your wallet password to sign this transaction:');
            if (password) {
                resolve(password);
            } else {
                reject(new Error('Password required to sign transaction'));
            }
        });
    }

    // Event handling
    on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }
}

// Provider Bundle - Initialize and expose providers
export function initializeProviders() {
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
}

// Auto-initialize when script loads
initializeProviders();