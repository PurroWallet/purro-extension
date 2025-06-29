// EIP-1193 Provider Interface
export interface EIP1193Provider {
    // Methods
    request(args: RequestArguments): Promise<unknown>;

    // Events
    on(eventName: string, listener: (...args: any[]) => void): this;
    removeListener(eventName: string, listener: (...args: any[]) => void): this;

    // Optional methods
    enable?(): Promise<string[]>;
    send?(method: string, params?: any[]): Promise<any>;
    sendAsync?(payload: JsonRpcRequest, callback: (error: any, result: any) => void): void;
}

export interface RequestArguments {
    method: string;
    params?: unknown[] | Record<string, unknown>;
}

export interface JsonRpcRequest {
    id: string | number;
    jsonrpc: "2.0";
    method: string;
    params?: any[];
}

export interface JsonRpcResponse {
    id: string | number;
    jsonrpc: "2.0";
    result?: any;
    error?: JsonRpcError;
}

export interface JsonRpcError {
    code: number;
    message: string;
    data?: any;
}

// EIP-6963 Provider Discovery
export interface EIP6963ProviderInfo {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
}

export interface EIP6963ProviderDetail {
    info: EIP6963ProviderInfo;
    provider: EIP1193Provider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
    type: "eip6963:announceProvider";
    detail: EIP6963ProviderDetail;
}

export interface EIP6963RequestProviderEvent extends CustomEvent {
    type: "eip6963:requestProvider";
}

// Provider Events
export type ProviderEventMap = {
    connect: { chainId: string };
    disconnect: { code: number; message: string };
    accountsChanged: string[];
    chainChanged: string;
    message: { type: string; data: any };
};

// Chain Information
export interface ChainInfo {
    chainId: string;
    chainName: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
    iconUrls?: string[];
}

// Wallet Connection State
export interface WalletState {
    isConnected: boolean;
    accounts: string[];
    chainId: string;
    networkVersion: string;
}

// Provider Error Codes (EIP-1193)
export enum ProviderErrorCode {
    USER_REJECTED = 4001,
    UNAUTHORIZED = 4100,
    UNSUPPORTED_METHOD = 4200,
    DISCONNECTED = 4900,
    CHAIN_DISCONNECTED = 4901,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    PARSE_ERROR = -32700,
}

export class ProviderError extends Error {
    code: number;
    data?: any;

    constructor(code: number, message: string, data?: any) {
        super(message);
        this.code = code;
        this.data = data;
        this.name = "ProviderError";
    }
} 