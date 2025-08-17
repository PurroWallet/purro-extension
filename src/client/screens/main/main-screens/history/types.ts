import type { EtherscanTransaction } from '@/client/types/etherscan-api';

export interface TokenInfo {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logo?: string;
}

export interface TransactionWithChain extends EtherscanTransaction {
    chainId: number;
    chainName: string;
    type: 'send' | 'receive';
    method: 'send' | 'receive' | 'swap' | 'deposit' | 'withdraw';
    tokenInfo?: TokenInfo;
    tokenAmount?: string;
    outputTokenInfo?: TokenInfo;
    outputTokenAmount?: string;
    isTokenTransfer: boolean;
}

export interface GroupedTransactions {
    date: string;
    transactions: TransactionWithChain[];
}

export interface MethodInfo {
    label: string;
    color: string;
    icon: any; // Lucide icon component
}

export interface TransactionAnalysis {
    method: TransactionWithChain['method'];
    isTokenTransfer: boolean;
}

export interface ExtractedTokenInfo {
    tokenAddress?: string;
    tokenAmount?: string;
    outputTokenAddress?: string;
    outputTokenAmount?: string;
}

export interface DecodedTransactionData {
    name: string;
    args?: any[];
} 