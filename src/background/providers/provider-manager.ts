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

                // Special debugging for ETH_REQUEST_ACCOUNTS
                const pendingRequest = this.pendingRequests.get(requestId);
                if (pendingRequest) {

                    // Check if this was an ETH_REQUEST_ACCOUNTS request
                    const isEthRequest = Array.from(this.pendingRequests.entries())
                        .some(([id, _req]) => id === requestId);

                    if (isEthRequest) {
                    }

                    this.pendingRequests.delete(requestId);
                    if (response.success) {
                        pendingRequest.resolve(response.data);
                    } else {
                        pendingRequest.reject(new Error(response.error || 'Request failed'));
                    }
                } else {
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
            this.initializeConnectionState();
        }, 50);
    }

    // Initialize connection state with better error handling
    private async initializeConnectionState() {
        try {

            // Use unified connection status check
            const connectedAccountForSite = await this.getConnectedAccountForSite();

            if (connectedAccountForSite && connectedAccountForSite.address) {
                // Site is connected - set up state immediately
                this.isConnected = true;
                this.accounts = connectedAccountForSite.accounts || [connectedAccountForSite.address];
                this.activeAccount = connectedAccountForSite.address;

                // Update cache
                this.accountsCache = this.accounts;
                this.accountsCacheTimestamp = Date.now();

                // Emit events to notify dApp with a small delay to ensure listeners are ready
                setTimeout(() => {
                    this.emit('connect', { accounts: this.accounts, activeAccount: this.activeAccount });
                    this.emit('accountsChanged', this.accounts);
                }, 150);

            } else {
                // Not connected - ensure clean state
                this.isConnected = false;
                this.accounts = [];
                this.activeAccount = null;
                this.accountsCache = null;
                this.accountsCacheTimestamp = 0;

                // Still emit accountsChanged with empty array to let dApp know we're ready
                setTimeout(() => {
                    this.emit('accountsChanged', []);
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
            }, 150);
        }
    }

    // Simplified method to refresh connection state
    private async refreshConnectionState() {
        try {
            const connectedAccountForSite = await this.getConnectedAccountForSite();

            if (connectedAccountForSite && connectedAccountForSite.address) {
                this.isConnected = true;
                this.accounts = connectedAccountForSite.accounts || [connectedAccountForSite.address];
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
            // Use the unified connection status check
            const connectionStatus = await this.sendMessage('CHECK_CONNECTION_STATUS', {
                origin: window.location.origin
            });

            if (connectionStatus && connectionStatus.success && connectionStatus.data?.isConnected) {
                return {
                    address: connectionStatus.data.activeAccount,
                    accounts: connectionStatus.data.accounts
                };
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

            this.pendingRequests.set(requestId, { resolve, reject });

            const message = {
                source: 'purro-provider',
                type,
                data,
                requestId
            };

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

            // First check if already connected using the unified connection status check
            const connectionStatus = await this.sendMessage('CHECK_CONNECTION_STATUS', {
                origin: window.location.origin
            });

            if (connectionStatus && connectionStatus.success && connectionStatus.data?.isConnected) {
                this.isConnected = true;
                this.accounts = connectionStatus.data.accounts || [];
                this.activeAccount = connectionStatus.data.activeAccount || null;

                // Update caches
                this.accountsCache = this.accounts;
                this.accountsCacheTimestamp = Date.now();

                this.emit('connect', { accounts: this.accounts, activeAccount: this.activeAccount });
                this.emit('accountsChanged', this.accounts);

                return {
                    accounts: this.accounts,
                    activeAccount: this.activeAccount
                };
            }

            // Not connected yet - proceed with connection flow using ETH_REQUEST_ACCOUNTS
            // This ensures consistent behavior with dApp connection requests
            const result = await this.sendMessage('ETH_REQUEST_ACCOUNTS');

            if (!result || !result.success) {
                throw new Error(result?.error || 'Connection failed');
            }

            this.isConnected = true;

            // Handle response format consistently
            const connectionData = result.data;
            if (!connectionData || typeof connectionData !== 'object') {
                throw new Error('Invalid connection response format');
            }

            this.accounts = connectionData.accounts || [];
            this.activeAccount = connectionData.activeAccount || null;

            // Update caches with new connection
            this.accountsCache = this.accounts;
            this.accountsCacheTimestamp = Date.now();

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

            await this.sendMessage('DISCONNECT_WALLET');

            this.isConnected = false;
            this.accounts = [];
            this.activeAccount = null;

            // Clear caches
            this.accountsCache = null;
            this.accountsCacheTimestamp = 0;

            this.emit('disconnect');
            this.emit('accountsChanged', []);

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
            return this.accountsCache;
        }

        // If we have accounts in memory, return them and update cache
        if (this.accounts.length > 0) {
            this.accountsCache = this.accounts;
            this.accountsCacheTimestamp = Date.now();
            return this.accounts;
        }

        // If no accounts in memory but connected, refresh state
        try {
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
