// EVM Provider Implementation (EIP-1193)
interface RequestArguments {
    method: string;
    params?: unknown[] | object;
}

interface EthereumProvider {
    request(args: RequestArguments): Promise<unknown>;
    on(eventName: string, listener: (...args: any[]) => void): this;
    removeListener(eventName: string, listener: (...args: any[]) => void): this;
    enable?(): Promise<string[]>;
    send?(method: string, params?: any[]): Promise<any>;
    sendAsync?(payload: any, callback: (error: any, result: any) => void): void;
    isMetaMask?: boolean;
    isPurro?: boolean;
    chainId?: string;
    networkVersion?: string;
    selectedAddress?: string | null;
}

// Provider error utility
export class ProviderError extends Error {
    public code: number;
    public data?: unknown;

    constructor(code: number, message: string, data?: unknown) {
        super(message);
        this.code = code;
        this.data = data;
        this.name = 'ProviderError';
    }
}

// Common provider error codes
export const PROVIDER_ERRORS = {
    UNAUTHORIZED: 4001,
    UNSUPPORTED_METHOD: 4200,
    DISCONNECTED: 4900,
    CHAIN_DISCONNECTED: 4901,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
} as const;

export class PurroEVMProvider implements EthereumProvider {
    public isPurro = true;
    public isMetaMask = false;
    public chainId = '0x3e8'; // Default to Hyperliquid
    public networkVersion = '999'; // Default to Hyperliquid
    public selectedAddress: string | null = null;

    private eventListeners: Map<string, Function[]> = new Map();
    private providerManager: any;
    private lastEmittedAccounts: string[] = [];
    private isInitializing = false;

    // Expose isConnected property for dApps that check it
    get isConnected(): boolean {
        return this.providerManager?.isConnected || false;
    }

    constructor(providerManager: any) {
        this.providerManager = providerManager;
        this.initializeSelectedAddressSync();
        this.init();
        this.initializeNetworkState();
        this.initializeSelectedAddress();
    }

    private async initializeNetworkState() {
        try {
            // Get current chain ID from background script
            const result = await this.sendMessage("GET_CURRENT_CHAIN_ID");
            if (result && result.chainId) {
                this.chainId = `0x${result.chainId.toString(16)}`;
                this.networkVersion = result.chainId.toString();
            }
        } catch (error) {
            console.warn('Failed to initialize network state:', error);
        }
    }

    private initializeSelectedAddressSync() {
        // Sync initialization to avoid race conditions
        if (this.providerManager && this.providerManager.activeAccount) {
            this.selectedAddress = this.providerManager.activeAccount;
        }
    }

    private async initializeSelectedAddress() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            const result = await this.getConnectedAccountForSite();

            if (result && result.address) {
                const newAddress = result.address;
                const accountsToEmit = [newAddress];

                if (this.selectedAddress !== newAddress ||
                    JSON.stringify(this.lastEmittedAccounts) !== JSON.stringify(accountsToEmit)) {

                    this.selectedAddress = newAddress;

                    if (this.providerManager) {
                        this.providerManager.isConnected = true;
                        this.providerManager.accounts = accountsToEmit;
                        this.providerManager.activeAccount = newAddress;
                    }

                    this.emit('accountsChanged', accountsToEmit);
                    this.lastEmittedAccounts = accountsToEmit;
                }
                return;
            }

            if (this.providerManager.isConnected && this.providerManager.activeAccount) {
                const newAddress = this.providerManager.activeAccount;
                const accountsToEmit = [newAddress];

                if (this.selectedAddress !== newAddress ||
                    JSON.stringify(this.lastEmittedAccounts) !== JSON.stringify(accountsToEmit)) {

                    this.selectedAddress = newAddress;
                    this.emit('accountsChanged', accountsToEmit);
                    this.lastEmittedAccounts = accountsToEmit;
                }
            } else {
                if (this.selectedAddress !== null || this.lastEmittedAccounts.length > 0) {
                    this.selectedAddress = null;
                    this.emit('accountsChanged', []);
                    this.lastEmittedAccounts = [];
                }
            }
        } catch (error) {
            if (this.selectedAddress !== null || this.lastEmittedAccounts.length > 0) {
                this.selectedAddress = null;
                this.emit('accountsChanged', []);
                this.lastEmittedAccounts = [];
            }
        } finally {
            this.isInitializing = false;
        }
    }

    private init() {
        this.providerManager.on('connect', (data: any) => {
            this.selectedAddress = data.activeAccount;
            this.emit('connect', data);
            this.emit('accountsChanged', data.accounts || []);
            // Emit chainChanged to ensure dApp has correct network info
            this.emit('chainChanged', this.chainId);
        });

        this.providerManager.on('disconnect', () => {
            this.selectedAddress = null;
            this.emit('disconnect');
            this.emit('accountsChanged', []);
        });

        this.providerManager.on('accountsChanged', (accounts: string[]) => {
            this.selectedAddress = accounts[0] || null;
            this.emit('accountsChanged', accounts);
        });

        this.providerManager.on('accountChanged', (account: string) => {
            this.selectedAddress = account;
            this.emit('accountsChanged', account ? [account] : []);
        });
    }

    // Event handling methods
    on(eventName: string, listener: (...args: any[]) => void): this {

        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName)!.push(listener);

        return this;
    }

    removeListener(eventName: string, listener: (...args: any[]) => void): this {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }

    protected emit(eventName: string, ...args: any[]): void {
        const listeners = this.eventListeners.get(eventName);


        if (listeners && listeners.length > 0) {
            listeners.forEach((listener, _index) => {
                try {

                    listener(...args);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        } else {
            console.warn(`⚠️ No listeners found for event: ${eventName}`);
        }
    }

    getChainId(): string {
        return this.chainId;
    }

    getNetworkVersion(): string {
        return this.networkVersion;
    }

    // Helper method for sending messages to background script
    private async sendMessage(type: string, data?: any): Promise<any> {
        return await this.providerManager.sendMessage(type, data);
    }

    private async getConnectedAccountForSite(): Promise<any> {
        try {
            // Get active account and check if current site is connected
            const activeAccountResult = await this.sendMessage('GET_ACTIVE_ACCOUNT');
            if (!activeAccountResult || !activeAccountResult.data) {
                return null;
            }

            const activeAccount = activeAccountResult.data;
            const connectedSitesResult = await this.sendMessage('GET_CONNECTED_SITES', { accountId: activeAccount.id });

            if (!connectedSitesResult || !connectedSitesResult.data) {
                return null;
            }

            const connectedSites = connectedSitesResult.data;
            const currentSite = connectedSites.find((site: any) => site.origin === window.location.origin);

            if (currentSite) {
                // Get wallet address for this account
                const walletResult = await this.sendMessage('GET_WALLET_BY_ID', { accountId: activeAccount.id });
                if (walletResult && walletResult.data && walletResult.data.eip155) {
                    return { address: walletResult.data.eip155.address };
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting connected account for site:', error);
            return null;
        }
    }

    // Main request method - handles all EVM RPC calls
    async request(args: RequestArguments): Promise<unknown> {
        const { method, params } = args;

        try {
            switch (method) {
                case 'eth_requestAccounts':
                    return await this.handleRequestAccounts();

                case 'eth_accounts':
                    return await this.handleGetAccounts();

                case 'eth_chainId':
                    // Ensure we have the latest chainId from background
                    try {
                        const result = await this.sendMessage("GET_CURRENT_CHAIN_ID");
                        if (result && result.data && result.data.chainId) {
                            const newChainId = `0x${result.data.chainId.toString(16)}`;
                            if (newChainId !== this.chainId) {
                                this.chainId = newChainId;
                                this.networkVersion = result.data.chainId.toString();
                            }
                        }
                    } catch (error) {
                        console.warn('Failed to get latest chain ID:', error);
                    }
                    return this.chainId;

                case 'net_version':
                    // Ensure we have the latest networkVersion from background
                    try {
                        const result = await this.sendMessage("GET_CURRENT_CHAIN_ID");
                        if (result && result.data && result.data.chainId) {
                            const newChainId = `0x${result.data.chainId.toString(16)}`;
                            const newNetworkVersion = result.data.chainId.toString();
                            if (newChainId !== this.chainId) {
                                this.chainId = newChainId;
                                this.networkVersion = newNetworkVersion;
                            }
                        }
                    } catch (error) {
                        console.warn('Failed to get latest network version:', error);
                    }
                    return this.networkVersion;

                case 'eth_sendTransaction':
                    return await this.handleSendTransaction(params);

                case 'eth_signTransaction':
                    return await this.handleSignTransaction(params);

                case 'personal_sign':
                    return await this.handlePersonalSign(params);

                case 'eth_sign':
                    return await this.handleEthSign(params);

                case 'eth_signTypedData':
                case 'eth_signTypedData_v3':
                case 'eth_signTypedData_v4':
                    return await this.handleSignTypedData(params);

                case 'wallet_addEthereumChain':
                    return await this.handleAddChain(params);

                case 'eth_getBalance':
                    return await this.handleGetBalance(params);

                case 'eth_call':
                    return await this.handleCall(params);

                case 'eth_estimateGas':
                    return await this.handleEstimateGas(params);

                case 'eth_gasPrice':
                    return await this.handleGetGasPrice();

                case 'eth_getTransactionCount':
                    return await this.handleGetTransactionCount(params);

                case 'eth_getTransactionReceipt':
                    return await this.handleGetTransactionReceipt(params);

                case 'eth_getBlockByNumber':
                    return await this.handleGetBlockByNumber(params);

                case 'eth_blockNumber':
                    return await this.handleGetBlockNumber();

                case 'eth_getCode':
                    return await this.handleGetCode(params);

                case 'eth_getLogs':
                    return await this.handleGetLogs(params);

                case 'net_listening':
                    return true;

                case 'web3_clientVersion':
                    return 'Purro/1.0.0';

                case 'eth_protocolVersion':
                    return '0x41';

                case 'eth_syncing':
                    return false;

                case 'eth_coinbase':
                    return this.selectedAddress;

                case 'eth_mining':
                    return false;

                case 'eth_hashrate':
                    return '0x0';

                case 'eth_getStorageAt':
                    return await this.handleGetStorageAt(params);

                case 'wallet_getPermissions':
                    return await this.handleGetPermissions();

                case 'wallet_requestPermissions':
                    return await this.handleRequestPermissions(params);

                case 'wallet_switchEthereumChain':
                    return await this.handleSwitchEthereumChain(params);

                default:
                    throw this.createProviderError(4200, `Method ${method} not supported`);
            }
        } catch (error) {
            if (error instanceof Error && 'code' in error) {
                throw error;
            }
            throw this.createProviderError(4001, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    // Account management methods
    private async handleRequestAccounts(): Promise<string[]> {
        try {
            const result = await this.sendMessage("ETH_REQUEST_ACCOUNTS");

            // Handle double-wrapped response from message handler
            let accounts = [];

            if (result?.data?.data?.accounts) {
                // Double wrapped: message handler wraps EVM handler response
                accounts = result.data.data.accounts;
            } else if (result?.data?.accounts) {
                // Single wrapped
                accounts = result.data.accounts;
            } else if (result?.accounts) {
                // Direct accounts
                accounts = result.accounts;
            }

            // Update provider state when we get accounts (including existing connections)
            if (accounts.length > 0) {
                const newAddress = accounts[0];

                // Update selectedAddress
                this.selectedAddress = newAddress;

                // Update provider manager state
                if (this.providerManager) {
                    this.providerManager.isConnected = true;
                    this.providerManager.accounts = accounts;
                    this.providerManager.activeAccount = newAddress;
                }

                // Emit accountsChanged event to notify dApp
                this.emit('accountsChanged', accounts);
                this.lastEmittedAccounts = accounts;

                // Also emit connect event for dApps that listen for it
                this.emit('connect', { accounts, activeAccount: newAddress });

                // Force trigger any pending dApp checks with a small delay
                setTimeout(() => {
                    this.emit('accountsChanged', accounts);
                    this.emit('connect', { accounts, activeAccount: newAddress });
                }, 100);
            }

            return accounts;
        } catch (error) {
            console.error('❌ handleRequestAccounts error:', error);
            this.selectedAddress = null;
            this.emit('accountsChanged', []);
            throw error;
        }
    }

    private async handleGetAccounts(): Promise<string[]> {
        try {
            // Fast path: return selectedAddress if already set
            if (this.selectedAddress) {
                return [this.selectedAddress];
            }

            // Check storage for connected account
            const result = await this.getConnectedAccountForSite();

            if (result && result.address) {
                const newAddress = result.address;
                const accountsToReturn = [newAddress];

                this.selectedAddress = newAddress;

                if (this.providerManager) {
                    this.providerManager.isConnected = true;
                    this.providerManager.accounts = accountsToReturn;
                    this.providerManager.activeAccount = newAddress;
                }

                if (JSON.stringify(this.lastEmittedAccounts) !== JSON.stringify(accountsToReturn)) {
                    this.emit('accountsChanged', accountsToReturn);
                    this.lastEmittedAccounts = accountsToReturn;
                }

                return accountsToReturn;
            }

            // Fallback: try to get accounts from provider
            const accounts = await this.providerManager.getAccounts();

            if (accounts.length > 0) {
                if (this.selectedAddress !== accounts[0]) {
                    this.selectedAddress = accounts[0];

                    if (JSON.stringify(this.lastEmittedAccounts) !== JSON.stringify(accounts)) {
                        this.emit('accountsChanged', accounts);
                        this.lastEmittedAccounts = accounts;
                    }
                }
            } else {
                if (this.selectedAddress !== null) {
                    this.selectedAddress = null;

                    if (this.lastEmittedAccounts.length > 0) {
                        this.emit('accountsChanged', []);
                        this.lastEmittedAccounts = [];
                    }
                }
            }

            return accounts;
        } catch (error) {
            console.error('Error getting accounts:', error);
            if (this.selectedAddress !== null) {
                this.selectedAddress = null;
                if (this.lastEmittedAccounts.length > 0) {
                    this.emit('accountsChanged', []);
                    this.lastEmittedAccounts = [];
                }
            }
            return [];
        }
    }

    // Transaction methods
    private async handleSendTransaction(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid transaction parameters');
        }

        const [txObject] = params;

        if (!txObject.from) {
            txObject.from = this.selectedAddress;
        }

        const result = await this.sendMessage("EVM_SEND_TRANSACTION", {
            transactionData: txObject
        });

        return result.transactionHash;
    }

    private async handleSignTransaction(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid transaction parameters');
        }

        const [txObject] = params;

        if (!txObject.from) {
            txObject.from = this.selectedAddress;
        }

        const result = await this.sendMessage("EVM_SIGN_TRANSACTION", {
            transactionData: txObject
        });

        return result.signedTransaction;
    }

    // Signing methods
    private async handlePersonalSign(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length < 2) {
            throw this.createProviderError(4001, 'Invalid personal sign parameters');
        }

        const [message, address] = params;

        const result = await this.sendMessage("PERSONAL_SIGN", {
            message,
            address: address || this.selectedAddress
        });

        return result.signature;
    }

    private async handleEthSign(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length < 2) {
            throw this.createProviderError(4001, 'Invalid eth_sign parameters');
        }

        const [address, message] = params;

        const result = await this.sendMessage("ETH_SIGN", {
            address: address || this.selectedAddress,
            message
        });

        return result.signature;
    }

    private async handleSignTypedData(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length < 2) {
            throw this.createProviderError(4001, 'Invalid typed data parameters');
        }

        const [address, typedData] = params;

        const result = await this.sendMessage("SIGN_TYPED_DATA", {
            address: address || this.selectedAddress,
            typedData
        });

        return result.signature;
    }

    // Chain management methods
    private async handleAddChain(params: any): Promise<null> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid add chain parameters');
        }

        const [chainParams] = params;

        const result = await this.sendMessage("ADD_ETHEREUM_CHAIN", {
            chainParams
        });

        if (result.success) {
            return null;
        }

        throw this.createProviderError(4001, 'User rejected the request');
    }

    // RPC methods
    private async handleGetBalance(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid balance parameters');
        }

        const [address, blockTag = 'latest'] = params;

        const result = await this.sendMessage("EVM_GET_BALANCE", {
            address,
            blockTag
        });

        return result.balance;
    }

    private async handleCall(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid call parameters');
        }

        const [callObject, blockTag = 'latest'] = params;

        const result = await this.sendMessage("EVM_CALL", {
            callObject,
            blockTag
        });

        return result.data;
    }

    private async handleEstimateGas(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid estimate gas parameters');
        }

        const [txObject] = params;

        const result = await this.sendMessage("EVM_ESTIMATE_GAS", {
            txObject
        });

        return result.gasEstimate;
    }

    private async handleGetGasPrice(): Promise<string> {
        const result = await this.sendMessage("EVM_GET_GAS_PRICE");
        return result.gasPrice;
    }

    private async handleGetTransactionCount(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid transaction count parameters');
        }

        const [address, blockTag = 'latest'] = params;

        const result = await this.sendMessage("EVM_GET_TRANSACTION_COUNT", {
            address,
            blockTag
        });

        return result.nonce;
    }

    private async handleGetTransactionReceipt(params: any): Promise<any> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid transaction receipt parameters');
        }

        const [txHash] = params;

        const result = await this.sendMessage("EVM_GET_TRANSACTION_RECEIPT", {
            txHash
        });

        return result.receipt;
    }

    private async handleGetBlockByNumber(params: any): Promise<any> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid block parameters');
        }

        const [blockNumber, fullTransactions = false] = params;

        const result = await this.sendMessage("EVM_GET_BLOCK_BY_NUMBER", {
            blockNumber,
            fullTransactions
        });

        return result.block;
    }

    private async handleGetBlockNumber(): Promise<string> {
        const result = await this.sendMessage("EVM_GET_BLOCK_NUMBER");
        return result.blockNumber;
    }

    private async handleGetCode(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid getCode parameters');
        }

        const [address, blockTag = 'latest'] = params;

        const result = await this.sendMessage("EVM_GET_CODE", {
            address,
            blockTag
        });

        return result.code;
    }

    private async handleGetLogs(params: any): Promise<any[]> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid getLogs parameters');
        }

        const [filterObject] = params;

        const result = await this.sendMessage("EVM_GET_LOGS", {
            filterObject
        });

        return result.logs;
    }

    private async handleGetStorageAt(params: any): Promise<string> {
        if (!params || !Array.isArray(params) || params.length < 2) {
            throw this.createProviderError(4001, 'Invalid getStorageAt parameters');
        }

        const [address, position, blockTag = 'latest'] = params;

        const result = await this.sendMessage("EVM_GET_STORAGE_AT", {
            address,
            position,
            blockTag
        });

        return result.data;
    }

    // Wallet permission methods
    private async handleGetPermissions(): Promise<any[]> {
        // Return current permissions - typically eth_accounts permission
        if (this.providerManager.isConnected) {
            return [{
                id: 'eth_accounts',
                parentCapability: 'eth_accounts',
                invoker: window.location.origin,
                caveats: []
            }];
        }
        return [];
    }

    private async handleRequestPermissions(params: any): Promise<any[]> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid permission parameters');
        }

        const [permissions] = params;

        // Check if requesting eth_accounts permission
        if (permissions.eth_accounts) {
            // This will trigger connection if not already connected
            await this.handleRequestAccounts();

            return [{
                id: 'eth_accounts',
                parentCapability: 'eth_accounts',
                invoker: window.location.origin,
                caveats: []
            }];
        }

        throw this.createProviderError(4001, 'Requested permissions not supported');
    }

    private async handleSwitchEthereumChain(params: any): Promise<null> {
        if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid switch chain parameters');
        }

        const [{ chainId }] = params;

        if (!chainId) {
            throw this.createProviderError(4001, 'Missing chainId parameter');
        }

        try {
            const result = await this.sendMessage("SWITCH_ETHEREUM_CHAIN", { chainId });

            if (result && result.data && result.data.chainId) {
                // Update local state
                const newChainId = `0x${result.data.chainId.toString(16)}`;
                const oldChainId = this.chainId;

                this.chainId = newChainId;
                this.networkVersion = result.data.chainId.toString();

                // Emit chainChanged event if chain actually changed
                if (oldChainId !== newChainId) {
                    this.emit('chainChanged', newChainId);
                }
            } else {
                console.warn('⚠️ Unexpected result structure:', result);
            }

            // wallet_switchEthereumChain returns null on success
            return null;
        } catch (error) {
            console.error('❌ handleSwitchEthereumChain error:', error);

            // Handle specific error cases
            if (error instanceof Error) {
                if (error.message.includes('Extension context invalidated')) {
                    throw this.createProviderError(4001, 'Extension was reloaded. Please refresh the page and try again.');
                }
                if (error.message.includes('Unsupported chain')) {
                    throw this.createProviderError(4902, error.message);
                }
                if (error.message.includes('timeout')) {
                    throw this.createProviderError(4001, 'Request timeout. Please try again.');
                }
                throw this.createProviderError(4001, error.message);
            }
            throw this.createProviderError(4001, 'Failed to switch chain');
        }
    }

    private createProviderError(code: number, message: string, data?: unknown): ProviderError {
        return new ProviderError(code, message, data);
    }

    // Legacy methods for compatibility
    async enable(): Promise<string[]> {
        return await this.handleRequestAccounts();
    }

    async send(method: string, params?: any[]): Promise<any> {
        return await this.request({ method, params });
    }

    sendAsync(payload: any, callback: (error: any, result: any) => void): void {
        this.request({ method: payload.method, params: payload.params })
            .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
            .catch(error => callback(error, null));
    }
}