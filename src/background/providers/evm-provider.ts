import {
    EIP1193Provider,
    RequestArguments,
    JsonRpcRequest,
    JsonRpcResponse,
    EIP6963ProviderInfo,
    EIP6963ProviderDetail,
    WalletState,
    ChainInfo,
    ProviderError,
    ProviderErrorCode
} from '../types/evm-provider';

export class PurroEVMProvider implements EIP1193Provider {
    private eventEmitter = new EventTarget();
    private state: WalletState = {
        isConnected: false,
        accounts: [],
        chainId: '0x1', // Ethereum Mainnet
        networkVersion: '1'
    };

    // EIP-6963 Provider Information
    private providerInfo: EIP6963ProviderInfo = {
        uuid: crypto.randomUUID(),
        name: 'Purro Wallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiM2MzY2RjEiLz4KPHBhdGggZD0iTTE2IDhMMjQgMTZMMTYgMjRMOCAxNkwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
        rdns: 'com.purro.wallet'
    };

    private supportedChains: Map<string, ChainInfo> = new Map([
        ['0x1', {
            chainId: '0x1',
            chainName: 'Ethereum Mainnet',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.infura.io/v3/'],
            blockExplorerUrls: ['https://etherscan.io']
        }],
        ['0x89', {
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com']
        }],
        ['0xa4b1', {
            chainId: '0xa4b1',
            chainName: 'Arbitrum One',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://arb1.arbitrum.io/rpc'],
            blockExplorerUrls: ['https://arbiscan.io']
        }]
    ]);

    constructor() {
        this.initializeProvider();
    }

    private initializeProvider() {
        // Listen for account changes from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'ACCOUNT_CHANGED':
                    this.handleAccountsChanged(message.accounts);
                    break;
                case 'CHAIN_CHANGED':
                    this.handleChainChanged(message.chainId);
                    break;
                case 'DISCONNECT':
                    this.handleDisconnect();
                    break;
            }
        });
    }

    // EIP-1193 Main Method
    async request(args: RequestArguments): Promise<unknown> {
        const { method, params = [] } = args;
        const paramsArray = Array.isArray(params) ? params : [];

        try {
            switch (method) {
                case 'eth_requestAccounts':
                    return await this.requestAccounts();

                case 'eth_accounts':
                    return this.state.accounts;

                case 'eth_chainId':
                    return this.state.chainId;

                case 'net_version':
                    return this.state.networkVersion;

                case 'eth_getBalance':
                    return await this.getBalance(
                        paramsArray[0] as string,
                        paramsArray[1] as string
                    );

                case 'eth_sendTransaction':
                    return await this.sendTransaction(paramsArray[0] as any);

                case 'personal_sign':
                    return await this.personalSign(
                        paramsArray[0] as string,
                        paramsArray[1] as string
                    );

                case 'eth_signTypedData_v4':
                    return await this.signTypedData(
                        paramsArray[1] as string,
                        paramsArray[0] as string
                    );

                case 'wallet_addEthereumChain':
                    return await this.addEthereumChain(paramsArray[0] as ChainInfo);

                case 'wallet_switchEthereumChain':
                    return await this.switchEthereumChain(paramsArray[0] as { chainId: string });

                case 'wallet_getPermissions':
                    return await this.getPermissions();

                case 'wallet_requestPermissions':
                    return await this.requestPermissions(paramsArray[0] as any);

                default:
                    throw new ProviderError(
                        ProviderErrorCode.METHOD_NOT_FOUND,
                        `Method ${method} not supported`
                    );
            }
        } catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }
            throw new ProviderError(
                ProviderErrorCode.INTERNAL_ERROR,
                `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // Event Management
    on(eventName: string, listener: (...args: any[]) => void): this {
        this.eventEmitter.addEventListener(eventName, listener as EventListener);
        return this;
    }

    removeListener(eventName: string, listener: (...args: any[]) => void): this {
        this.eventEmitter.removeEventListener(eventName, listener as EventListener);
        return this;
    }

    // Legacy Methods for Compatibility
    async enable(): Promise<string[]> {
        return await this.requestAccounts();
    }

    async send(method: string, params?: any[]): Promise<any> {
        return await this.request({ method, params });
    }

    sendAsync(payload: JsonRpcRequest, callback: (error: any, result: any) => void): void {
        this.request({ method: payload.method, params: payload.params })
            .then(result => {
                callback(null, {
                    id: payload.id,
                    jsonrpc: '2.0',
                    result
                } as JsonRpcResponse);
            })
            .catch(error => {
                callback(error, {
                    id: payload.id,
                    jsonrpc: '2.0',
                    error: {
                        code: error.code || ProviderErrorCode.INTERNAL_ERROR,
                        message: error.message,
                        data: error.data
                    }
                } as JsonRpcResponse);
            });
    }

    // Private Methods
    private async requestAccounts(): Promise<string[]> {
        if (this.state.isConnected && this.state.accounts.length > 0) {
            return this.state.accounts;
        }

        // Request permission from user through popup
        const response = await chrome.runtime.sendMessage({
            type: 'REQUEST_ACCOUNTS',
            origin: window.location.origin
        });

        if (response.error) {
            throw new ProviderError(ProviderErrorCode.USER_REJECTED, response.error);
        }

        this.state.accounts = response.accounts;
        this.state.isConnected = true;

        this.emit('connect', { chainId: this.state.chainId });
        this.emit('accountsChanged', this.state.accounts);

        return this.state.accounts;
    }

    private async getBalance(address: string, blockTag: string = 'latest'): Promise<string> {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_BALANCE',
            address,
            blockTag,
            chainId: this.state.chainId
        });

        if (response.error) {
            throw new ProviderError(ProviderErrorCode.INTERNAL_ERROR, response.error);
        }

        return response.balance;
    }

    private async sendTransaction(transaction: any): Promise<string> {
        if (!this.state.isConnected) {
            throw new ProviderError(ProviderErrorCode.UNAUTHORIZED, 'Wallet not connected');
        }

        const response = await chrome.runtime.sendMessage({
            type: 'SEND_TRANSACTION',
            transaction,
            chainId: this.state.chainId
        });

        if (response.error) {
            if (response.error.includes('User rejected')) {
                throw new ProviderError(ProviderErrorCode.USER_REJECTED, response.error);
            }
            throw new ProviderError(ProviderErrorCode.INTERNAL_ERROR, response.error);
        }

        return response.hash;
    }

    private async personalSign(message: string, address: string): Promise<string> {
        if (!this.state.isConnected) {
            throw new ProviderError(ProviderErrorCode.UNAUTHORIZED, 'Wallet not connected');
        }

        const response = await chrome.runtime.sendMessage({
            type: 'PERSONAL_SIGN',
            message,
            address
        });

        if (response.error) {
            if (response.error.includes('User rejected')) {
                throw new ProviderError(ProviderErrorCode.USER_REJECTED, response.error);
            }
            throw new ProviderError(ProviderErrorCode.INTERNAL_ERROR, response.error);
        }

        return response.signature;
    }

    private async signTypedData(address: string, typedData: string): Promise<string> {
        if (!this.state.isConnected) {
            throw new ProviderError(ProviderErrorCode.UNAUTHORIZED, 'Wallet not connected');
        }

        const response = await chrome.runtime.sendMessage({
            type: 'SIGN_TYPED_DATA',
            address,
            typedData
        });

        if (response.error) {
            if (response.error.includes('User rejected')) {
                throw new ProviderError(ProviderErrorCode.USER_REJECTED, response.error);
            }
            throw new ProviderError(ProviderErrorCode.INTERNAL_ERROR, response.error);
        }

        return response.signature;
    }

    private async addEthereumChain(chainInfo: ChainInfo): Promise<null> {
        const response = await chrome.runtime.sendMessage({
            type: 'ADD_ETHEREUM_CHAIN',
            chainInfo
        });

        if (response.error) {
            throw new ProviderError(ProviderErrorCode.USER_REJECTED, response.error);
        }

        this.supportedChains.set(chainInfo.chainId, chainInfo);
        return null;
    }

    private async switchEthereumChain(params: { chainId: string }): Promise<null> {
        const { chainId } = params;

        if (!this.supportedChains.has(chainId)) {
            throw new ProviderError(
                ProviderErrorCode.UNSUPPORTED_METHOD,
                `Chain ${chainId} not supported`
            );
        }

        const response = await chrome.runtime.sendMessage({
            type: 'SWITCH_ETHEREUM_CHAIN',
            chainId
        });

        if (response.error) {
            throw new ProviderError(ProviderErrorCode.USER_REJECTED, response.error);
        }

        this.state.chainId = chainId;
        this.state.networkVersion = parseInt(chainId, 16).toString();
        this.emit('chainChanged', chainId);

        return null;
    }

    private async getPermissions(): Promise<any[]> {
        return [
            {
                parentCapability: 'eth_accounts',
                id: crypto.randomUUID(),
                date: Date.now()
            }
        ];
    }

    private async requestPermissions(permissions: any): Promise<any[]> {
        // For now, just return the same as getPermissions
        return await this.getPermissions();
    }

    // Event Handlers
    private handleAccountsChanged(accounts: string[]) {
        this.state.accounts = accounts;
        this.state.isConnected = accounts.length > 0;
        this.emit('accountsChanged', accounts);

        if (accounts.length === 0) {
            this.emit('disconnect', { code: ProviderErrorCode.DISCONNECTED, message: 'User disconnected' });
        }
    }

    private handleChainChanged(chainId: string) {
        this.state.chainId = chainId;
        this.state.networkVersion = parseInt(chainId, 16).toString();
        this.emit('chainChanged', chainId);
    }

    private handleDisconnect() {
        this.state.isConnected = false;
        this.state.accounts = [];
        this.emit('disconnect', { code: ProviderErrorCode.DISCONNECTED, message: 'User disconnected' });
    }

    private emit(eventName: string, data: any) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventEmitter.dispatchEvent(event);
    }

    // EIP-6963 Provider Discovery
    getProviderDetail(): EIP6963ProviderDetail {
        return {
            info: this.providerInfo,
            provider: this
        };
    }

    // Public getter for provider info
    get info(): EIP6963ProviderInfo {
        return this.providerInfo;
    }

    // Check if connected
    get isConnected(): boolean {
        return this.state.isConnected;
    }

    // Get current chain ID
    get chainId(): string {
        return this.state.chainId;
    }

    // Get current accounts
    get selectedAddress(): string | null {
        return this.state.accounts[0] || null;
    }
}
