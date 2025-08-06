import { storageHandler } from './storage-handler';
import { supportedEVMChains } from '../constants/supported-chains';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { accountHandler } from './account-handler';
import { ethers } from 'ethers';
import { authHandler } from './auth-handler';
import { SIGNING_ERRORS, TRANSACTION_ERRORS } from '../constants/message-types';
import { TransactionRequest, PendingTransactionRequest } from '../types/evm-provider';

export interface MessageResponse {
    success: boolean;
    data?: any;
    error?: string;
    code?: number; // Error code for provider errors
    requestId?: string;
}

interface PendingConnection {
    origin: string;
    tabId?: number;
    timestamp: number;
    resolve: (response: any) => void;
    reject: (error: any) => void;
}

interface PendingSignRequest {
    origin: string;
    message: string;
    address: string;
    tabId?: number;
    timestamp: number;
    resolve: (response: any) => void;
    reject: (error: any) => void;
}

let pendingConnections: Map<string, PendingConnection> = new Map();
let pendingSignRequests: Map<string, PendingSignRequest> = new Map();
let pendingTransactionRequests: Map<string, PendingTransactionRequest> = new Map();

// Transaction timeout constants
const TRANSACTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const GAS_LIMIT_BUFFER = 1.2; // 20% buffer for gas estimation

export const evmHandler = {
    async handleEthRequestAccounts(sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
        let origin = 'unknown';
        let favicon = '';
        let title = '';

        if (sender.tab?.url) {
            const url = new URL(sender.tab.url);
            origin = url.origin;
            favicon = sender.tab.favIconUrl || '';
            title = sender.tab.title || '';
        }


        try {
            // First check connection status using the unified method
            const connectionStatus = await this.handleCheckConnectionStatus({ origin }, sender);

            if (connectionStatus.success && connectionStatus.data?.isConnected) {


                // Close any existing connect popups since we have existing connection
                await this.closeExistingConnectPopups();

                return {
                    success: true,
                    data: {
                        accounts: connectionStatus.data.accounts,
                        activeAccount: connectionStatus.data.activeAccount
                    }
                };
            }



            // Validate wallet state before showing popup
            const { hasWallet } = await storageHandler.getWalletState();
            if (!hasWallet) {
                throw new Error('No EVM wallet found for active account');
            }

            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                throw new Error('No active account found');
            }

            const wallet = await storageHandler.getWalletById(activeAccount.id);
            if (!wallet || !wallet.eip155) {
                throw new Error('EVM wallet not found for this account');
            }

            // Create pending connection and show popup
            const connectionPromise = createPendingConnection(origin, sender.tab?.id);

            const connectUrl = chrome.runtime.getURL('html/connect.html') +
                `?origin=${encodeURIComponent(origin)}&favicon=${encodeURIComponent(favicon)}&title=${encodeURIComponent(title)}`;

            const popupConfig = await this.calculatePopupPosition(sender);
            await chrome.windows.create({
                url: connectUrl,
                type: 'popup',
                width: popupConfig.width,
                height: popupConfig.height,
                focused: true,
                left: popupConfig.left,
                top: popupConfig.top,
            });

            const connectionResult = await connectionPromise;

            return {
                success: true,
                data: connectionResult,
            };
        } catch (error) {
            console.error('Error in handleEthRequestAccounts:', error);
            throw error;
        }
    },

    async handleApproveConnection(data: { origin: string; accountId: string; favicon?: string }): Promise<MessageResponse> {
        try {
            const account = await storageHandler.getAccountById(data.accountId);

            if (!account) {
                return {
                    success: false,
                    error: 'Account not found',
                    code: 4001
                };
            }

            // Get the wallet for this account to get the address
            const wallet = await storageHandler.getWalletById(data.accountId);
            if (!wallet || !wallet.eip155) {
                return {
                    success: false,
                    error: 'EVM wallet not found for this account',
                    code: 4001
                };
            }

            // Save the connected site
            await storageHandler.saveConnectedSite(data.accountId, {
                origin: data.origin,
                favicon: data.favicon,
                timestamp: Date.now()
            });

            // Resolve the pending connection with the account address
            const connectionResult = {
                accounts: [wallet.eip155.address],
                activeAccount: wallet.eip155.address
            };


            const pendingConnection = Array.from(pendingConnections.values())
                .find(conn => conn.origin === data.origin);

            if (pendingConnection) {

                pendingConnection.resolve(connectionResult);
                // Remove from pending connections
                for (const [key, conn] of pendingConnections.entries()) {
                    if (conn.origin === data.origin) {
                        pendingConnections.delete(key);

                        break;
                    }
                }
            } else {
                console.warn('⚠️ No pending connection found for origin:', data.origin);
            }

            return {
                success: true,
                data: connectionResult
            };
        } catch (error) {
            console.error('Error in handleApproveConnection:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to approve connection',
                code: 4001
            };
        }
    },

    async handleRejectConnection(data: { origin: string }): Promise<MessageResponse> {
        try {
            // Find and reject the pending connection
            const pendingConnection = Array.from(pendingConnections.values())
                .find(conn => conn.origin === data.origin);

            if (pendingConnection) {
                pendingConnection.reject(new Error('User rejected the request'));
                // Remove from pending connections
                for (const [key, conn] of pendingConnections.entries()) {
                    if (conn.origin === data.origin) {
                        pendingConnections.delete(key);
                        break;
                    }
                }
            }

            return {
                success: true,
                data: { rejected: true }
            };
        } catch (error) {
            console.error('Error in handleRejectConnection:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reject connection',
                code: 4001
            };
        }
    },

    async handleGetCurrentChainId(): Promise<MessageResponse> {
        try {
            // Get current chain ID from storage, default to Ethereum mainnet
            const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_CHAIN_ID);
            const chainId = result[STORAGE_KEYS.CURRENT_CHAIN_ID] || '0x1'; // Default to Ethereum mainnet

            return {
                success: true,
                data: { chainId: parseInt(chainId, 16) } // Return as number for compatibility
            };
        } catch (error) {
            console.error('Error in handleGetCurrentChainId:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get current chain ID',
                code: 4001
            };
        }
    },

    async handleSwitchEthereumChain(data: { chainId: string }): Promise<MessageResponse> {
        try {
            const { chainId } = data;

            // Validate chain ID format (should be hex string like "0x1")
            if (!chainId || !chainId.startsWith('0x')) {
                return {
                    success: false,
                    error: 'Invalid chain ID format. Expected hex string like "0x1"',
                    code: 4902 // Unrecognized chain ID
                };
            }

            // Check if the chain is supported
            if (!supportedEVMChains[chainId]) {
                return {
                    success: false,
                    error: `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(supportedEVMChains).join(', ')}`,
                    code: 4902 // Unrecognized chain ID
                };
            }

            // Save the new chain ID
            await chrome.storage.local.set({
                [STORAGE_KEYS.CURRENT_CHAIN_ID]: chainId
            });

            return {
                success: true,
                data: { chainId: parseInt(chainId, 16) }
            };
        } catch (error) {
            console.error('Error in handleSwitchEthereumChain:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to switch chain',
                code: 4001
            };
        }
    },

    async handleCheckConnectionStatus(data: { origin: string }, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
        try {
            let origin = data.origin;

            // If origin not provided in data, get from sender
            if (!origin && sender.tab?.url) {
                const url = new URL(sender.tab.url);
                origin = url.origin;
            }

            if (!origin) {
                return {
                    success: false,
                    error: 'Origin not found',
                    code: 4001
                };
            }



            const { hasWallet } = await storageHandler.getWalletState();
            if (!hasWallet) {
                return {
                    success: true,
                    data: { isConnected: false, accounts: [] }
                };
            }

            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                return {
                    success: true,
                    data: { isConnected: false, accounts: [] }
                };
            }

            const [wallet, connectedSites] = await Promise.all([
                storageHandler.getWalletById(activeAccount.id),
                storageHandler.getConnectedSites(activeAccount.id)
            ]);

            const existingConnection = connectedSites.find(site => site.origin === origin);

            if (existingConnection && wallet && wallet.eip155) {

                return {
                    success: true,
                    data: {
                        isConnected: true,
                        accounts: [wallet.eip155.address],
                        activeAccount: wallet.eip155.address
                    }
                };
            }


            return {
                success: true,
                data: { isConnected: false, accounts: [] }
            };
        } catch (error) {
            console.error('Error in handleCheckConnectionStatus:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to check connection status',
                code: 4001
            };
        }
    },

    async handleConnectWallet(sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
        try {
            // CONNECT_WALLET is essentially the same as ETH_REQUEST_ACCOUNTS
            // Delegate to the existing handler
            return await this.handleEthRequestAccounts(sender);
        } catch (error) {
            console.error('Error in handleConnectWallet:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to connect wallet',
                code: 4001
            };
        }
    },

    async handleDisconnectWallet(data: { origin?: string }, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
        try {
            let origin = data?.origin;

            // If origin not provided in data, get from sender
            if (!origin && sender.tab?.url) {
                const url = new URL(sender.tab.url);
                origin = url.origin;
            }

            if (!origin) {
                return {
                    success: false,
                    error: 'Origin not found',
                    code: 4001
                };
            }


            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                return {
                    success: true,
                    data: { disconnected: true }
                };
            }

            // Remove the connected site
            await storageHandler.deleteConnectedSite(activeAccount.id, origin);


            return {
                success: true,
                data: { disconnected: true }
            };
        } catch (error) {
            console.error('Error in handleDisconnectWallet:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
                code: 4001
            };
        }
    },

    async handlePersonalSign(data: { message: string, address: string }, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
        try {
            const { message, address } = data;

            // Validate input parameters
            if (!message) {
                return {
                    success: false,
                    error: 'Message is required',
                    code: 4001
                };
            }

            if (!address) {
                return {
                    success: false,
                    error: 'Address is required',
                    code: 4001
                };
            }

            // Check if wallet exists and is unlocked
            const { hasWallet } = await storageHandler.getWalletState();
            if (!hasWallet) {
                return {
                    success: false,
                    error: 'No wallet found',
                    code: 4001
                };
            }

            // Get active account
            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                return {
                    success: false,
                    error: 'No active account found',
                    code: 4001
                };
            }

            // Get wallet for the active account
            const wallet = await storageHandler.getWalletById(activeAccount.id);
            if (!wallet || !wallet.eip155) {
                return {
                    success: false,
                    error: 'EVM wallet not found for active account',
                    code: 4001
                };
            }

            // Verify that the requested address matches the active account's address
            if (wallet.eip155.address.toLowerCase() !== address.toLowerCase()) {
                return {
                    success: false,
                    error: 'Address does not match active account',
                    code: 4001
                };
            }

            // Get origin and site info for the popup
            let origin = 'unknown';
            let favicon = '';
            let title = '';

            if (sender.tab?.url) {
                const url = new URL(sender.tab.url);
                origin = url.origin;
                favicon = sender.tab.favIconUrl || '';
                title = sender.tab.title || '';
            }

            // Create pending sign request and show popup
            const signPromise = createPendingSignRequest(origin, message, address, sender.tab?.id);

            const signUrl = chrome.runtime.getURL('html/sign.html') +
                `?origin=${encodeURIComponent(origin)}&favicon=${encodeURIComponent(favicon)}&title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}&address=${encodeURIComponent(address)}`;

            const popupConfig = await this.calculatePopupPosition(sender);
            await chrome.windows.create({
                url: signUrl,
                type: 'popup',
                width: popupConfig.width,
                height: popupConfig.height,
                focused: true,
                left: popupConfig.left,
                top: popupConfig.top,
            });

            const signResult = await signPromise; // signResult is signature string

            return {
                success: true,
                data: signResult,
            };

        } catch (error) {
            console.error('Error in handlePersonalSign:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to sign message',
                code: 4001
            };
        }
    },

    /**
     * Handle EIP-712 typed data sign request. This follows a very similar flow to personal_sign
     * but receives a typedData object instead of a plain message string. We stringify the data
     * for transport to the signing popup and reuse the existing approve / reject flow.
     */
    async handleSignTypedData(
        data: { typedData: any; address: string },
        sender: chrome.runtime.MessageSender
    ): Promise<MessageResponse> {
        try {
            const { typedData, address } = data;

            if (!typedData) {
                return {
                    success: false,
                    error: 'typedData is required',
                    code: 4001,
                };
            }

            if (!address) {
                return {
                    success: false,
                    error: 'Address is required',
                    code: 4001,
                };
            }

            // Wallet checks – reuse the logic from personal sign
            const { hasWallet } = await storageHandler.getWalletState();
            if (!hasWallet) {
                return {
                    success: false,
                    error: 'No wallet found',
                    code: 4001,
                };
            }

            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                return {
                    success: false,
                    error: 'No active account found',
                    code: 4001,
                };
            }

            const wallet = await storageHandler.getWalletById(activeAccount.id);
            if (!wallet || !wallet.eip155) {
                return {
                    success: false,
                    error: 'EVM wallet not found for active account',
                    code: 4001,
                };
            }

            if (wallet.eip155.address.toLowerCase() !== address.toLowerCase()) {
                return {
                    success: false,
                    error: 'Address does not match active account',
                    code: 4001,
                };
            }

            // Extract origin information for the popup
            let origin = 'unknown';
            let favicon = '';
            let title = '';

            if (sender.tab?.url) {
                const url = new URL(sender.tab.url);
                origin = url.origin;
                favicon = sender.tab.favIconUrl || '';
                title = sender.tab.title || '';
            }

            // Stringify the typed data for transport/display
            const typedDataString = JSON.stringify(typedData);

            // Create a pending request and open the signing popup
            const signPromise = createPendingSignRequest(origin, typedDataString, address, sender.tab?.id);

            const signUrl =
                chrome.runtime.getURL('html/sign.html') +
                `?origin=${encodeURIComponent(origin)}&favicon=${encodeURIComponent(favicon)}&title=${encodeURIComponent(
                    title
                )}&message=${encodeURIComponent(typedDataString)}&address=${encodeURIComponent(address)}`;

            const popupConfig = await this.calculatePopupPosition(sender);
            await chrome.windows.create({
                url: signUrl,
                type: 'popup',
                width: popupConfig.width,
                height: popupConfig.height,
                focused: true,
                left: popupConfig.left,
                top: popupConfig.top,
            });

            const signResult = await signPromise; // signature string

            return {
                success: true,
                data: signResult,
            };
        } catch (error) {
            console.error('Error in handleSignTypedData:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to sign typed data',
                code: 4001,
            };
        }
    },

    async handleApproveSign(data: { origin: string; message: string; address: string }): Promise<MessageResponse> {
        console.log('[Purro] 🔄 Starting handleApproveSign process...', { origin: data.origin, address: data.address });

        try {
            const { origin, message, address } = data;

            // Get the active account
            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                console.error('[Purro] ❌ No active account found');
                return {
                    success: false,
                    error: SIGNING_ERRORS.NO_ACTIVE_ACCOUNT.message,
                    code: SIGNING_ERRORS.NO_ACTIVE_ACCOUNT.code
                };
            }

            console.log('[Purro] ✅ Active account found:', activeAccount.id);

            // Get wallet to verify address matches
            const wallet = await storageHandler.getWalletById(activeAccount.id);
            if (!wallet || !wallet.eip155) {
                console.error('[Purro] ❌ EVM wallet not found for active account');
                return {
                    success: false,
                    error: SIGNING_ERRORS.EVM_WALLET_NOT_FOUND.message,
                    code: SIGNING_ERRORS.EVM_WALLET_NOT_FOUND.code
                };
            }

            console.log('[Purro] ✅ Wallet found:', wallet.eip155.address);

            // Verify address matches
            if (wallet.eip155.address.toLowerCase() !== address.toLowerCase()) {
                console.error('[Purro] ❌ Address mismatch:', {
                    walletAddress: wallet.eip155.address.toLowerCase(),
                    requestedAddress: address.toLowerCase()
                });
                return {
                    success: false,
                    error: SIGNING_ERRORS.ADDRESS_MISMATCH.message,
                    code: SIGNING_ERRORS.ADDRESS_MISMATCH.code
                };
            }

            console.log('[Purro] ✅ Address verification passed');

            // Get private key for signing with enhanced error handling
            let privateKey: string;
            try {
                console.log('[Purro] 🔄 Retrieving private key...');
                privateKey = await accountHandler.getPrivateKeyByAccountId(activeAccount.id);
                console.log('[Purro] ✅ Private key retrieved successfully');
            } catch (error) {
                console.error('[Purro] ❌ Failed to retrieve private key:', error);

                // Check if it's a session issue
                const session = await authHandler.getSession();
                if (!session) {
                    console.error('[Purro] ❌ Session not found or expired');
                    return {
                        success: false,
                        error: SIGNING_ERRORS.SESSION_EXPIRED.message,
                        code: SIGNING_ERRORS.SESSION_EXPIRED.code
                    };
                }

                // Generic private key error
                return {
                    success: false,
                    error: SIGNING_ERRORS.PRIVATE_KEY_ACCESS_FAILED.message,
                    code: SIGNING_ERRORS.PRIVATE_KEY_ACCESS_FAILED.code
                };
            }

            // Create wallet instance for signing
            let signerWallet: ethers.Wallet;
            try {
                signerWallet = new ethers.Wallet(privateKey);
                console.log('[Purro] ✅ Signer wallet created');
            } catch (error) {
                console.error('[Purro] ❌ Failed to create signer wallet:', error);
                return {
                    success: false,
                    error: SIGNING_ERRORS.INVALID_PRIVATE_KEY.message,
                    code: SIGNING_ERRORS.INVALID_PRIVATE_KEY.code
                };
            }

            console.log('[Purro] 🔍 Approving sign, message payload:', message);

            // Handle hex-encoded messages (common in personal_sign)
            let messageToSign = message;
            if (message.startsWith('0x')) {
                try {
                    // Decode hex to UTF-8 string for signing
                    const hexWithoutPrefix = message.slice(2);
                    const decodedMessage = Buffer.from(hexWithoutPrefix, 'hex').toString('utf8');
                    console.log('[Purro] 🔍 Decoded hex message to:', decodedMessage);
                    messageToSign = decodedMessage;
                } catch (decodeError) {
                    console.warn('[Purro] ⚠️ Failed to decode hex message, using original:', decodeError);
                    // Use original message if decode fails
                }
            }

            let signature: string;

            // Attempt to detect if the message is an EIP-712 typed data JSON string
            let isEIP712 = false;
            let parsedTypedData = null;

            try {
                // Try parsing the message - handle double-encoded JSON
                // Use decoded message for JSON parsing (in case hex contains JSON)
                parsedTypedData = JSON.parse(messageToSign);

                // If first parse results in a string, try parsing again (double-encoded JSON)
                if (typeof parsedTypedData === 'string') {
                    console.log('[Purro] 🔍 Detected double-encoded JSON, parsing again...');
                    parsedTypedData = JSON.parse(parsedTypedData);
                }

                console.log('[Purro] 🔍 Final parsed data:', {
                    type: typeof parsedTypedData,
                    isObject: parsedTypedData && typeof parsedTypedData === 'object',
                    keys: parsedTypedData && typeof parsedTypedData === 'object' ? Object.keys(parsedTypedData) : [],
                    domain: parsedTypedData?.domain,
                    types: parsedTypedData?.types ? Object.keys(parsedTypedData.types) : undefined,
                    message: parsedTypedData?.message,
                    primaryType: parsedTypedData?.primaryType
                });

                // More robust EIP-712 detection
                const hasValidStructure = parsedTypedData &&
                    typeof parsedTypedData === 'object' &&
                    parsedTypedData.domain &&
                    parsedTypedData.types &&
                    parsedTypedData.message !== undefined && // Allow empty message
                    (parsedTypedData.primaryType || Object.keys(parsedTypedData.types || {}).find(key => key !== 'EIP712Domain'));

                if (hasValidStructure) {
                    isEIP712 = true;
                    console.log('[Purro] 🔍 EIP-712 typed data detected:', {
                        domain: parsedTypedData.domain,
                        primaryType: parsedTypedData.primaryType,
                        typesKeys: Object.keys(parsedTypedData.types),
                        messageKeys: typeof parsedTypedData.message === 'object' ? Object.keys(parsedTypedData.message) : 'not-object',
                        signerAddress: wallet.eip155.address
                    });
                } else {
                    console.log('[Purro] 🔍 Not valid EIP-712 format, detailed check:', {
                        hasParsedData: !!parsedTypedData,
                        isObject: parsedTypedData && typeof parsedTypedData === 'object',
                        hasDomain: !!(parsedTypedData?.domain),
                        hasTypes: !!(parsedTypedData?.types),
                        hasMessage: parsedTypedData?.message !== undefined,
                        hasPrimaryType: !!(parsedTypedData?.primaryType),
                        hasValidStructure
                    });
                }
            } catch (parseError) {
                console.log('[Purro] 🔍 JSON parse failed, not EIP-712 data:', parseError instanceof Error ? parseError.message : 'Unknown parse error');
                isEIP712 = false;
            }

            if (isEIP712 && parsedTypedData) {
                // EIP-712 signing
                try {
                    // Determine primary type
                    const primaryType = parsedTypedData.primaryType ||
                        Object.keys(parsedTypedData.types).find(key => key !== 'EIP712Domain');

                    if (!primaryType) {
                        throw new Error('Cannot determine primary type for EIP-712 signing');
                    }

                    // For EIP-712, remove EIP712Domain from types (ethers v6 auto-injects it)
                    const typesWithoutDomain = { ...parsedTypedData.types };
                    delete typesWithoutDomain.EIP712Domain;

                    console.log('[Purro] 🔍 EIP-712 signing with:', {
                        primaryType,
                        domain: parsedTypedData.domain,
                        types: typesWithoutDomain,
                        message: parsedTypedData.message
                    });

                    signature = await signerWallet.signTypedData(
                        parsedTypedData.domain,
                        typesWithoutDomain,
                        parsedTypedData.message
                    );
                    console.log('[Purro] ✅ EIP-712 signature generated successfully');
                } catch (signError) {
                    console.error('[Purro] ❌ EIP-712 signing failed:', signError);
                    throw new Error(`${SIGNING_ERRORS.EIP712_SIGNING_FAILED.message}: ${signError instanceof Error ? signError.message : 'Unknown signing error'}`);
                }
            } else {
                // Personal message signing
                console.log('[Purro] 🔍 Using personal_sign for message');
                try {
                    signature = await signerWallet.signMessage(messageToSign);
                    console.log('[Purro] ✅ Personal message signature generated successfully');
                } catch (signError) {
                    console.error('[Purro] ❌ Personal message signing failed:', signError);
                    throw new Error(`${SIGNING_ERRORS.SIGNING_FAILED.message}: ${signError instanceof Error ? signError.message : 'Unknown signing error'}`);
                }
            }

            // After generating signature, verify it locally
            try {
                let recovered: string | null = null;

                if (isEIP712 && parsedTypedData) {
                    // Verify EIP-712 signature
                    try {
                        console.log('[Purro] 🔍 Verifying EIP-712 signature...');
                        const typesWithoutDomain = { ...parsedTypedData.types };
                        delete typesWithoutDomain.EIP712Domain;

                        recovered = ethers.verifyTypedData(
                            parsedTypedData.domain,
                            typesWithoutDomain,
                            parsedTypedData.message,
                            signature
                        );
                        console.log('[Purro] 🔍 EIP-712 verification result:', recovered);
                    } catch (verifyErr) {
                        console.error('[Purro] ❌ EIP-712 verification error:', verifyErr);
                    }
                } else {
                    // Verify personal message signature
                    try {
                        recovered = ethers.verifyMessage(messageToSign, signature);
                        console.log('[Purro] 🔍 Personal message verification result:', recovered);
                    } catch (personalErr) {
                        console.error('[Purro] ❌ Personal message verification error:', personalErr);
                    }
                }

                console.log('[Purro] 🔍 Recovered address from signature:', recovered);

                // Verify signature matches expected address
                if (recovered && recovered.toLowerCase() !== wallet.eip155.address.toLowerCase()) {
                    console.warn('[Purro] ⚠️ Signature verification mismatch:', {
                        recovered: recovered.toLowerCase(),
                        expected: wallet.eip155.address.toLowerCase(),
                        signingMethod: isEIP712 ? 'EIP-712' : 'personal_sign'
                    });
                } else if (recovered) {
                    console.log('[Purro] ✅ Signature verification passed');
                }
            } catch (err) {
                console.warn('[Purro] ⚠️ Local verification failed:', err);
            }

            // Resolve the pending sign request
            const pendingSignRequest = Array.from(pendingSignRequests.values())
                .find(req => req.origin === origin);

            if (pendingSignRequest) {
                console.log('[Purro] ✅ Resolving pending sign request for origin:', origin);
                pendingSignRequest.resolve(signature);
                // Remove from pending requests
                for (const [key, req] of pendingSignRequests.entries()) {
                    if (req.origin === origin) {
                        pendingSignRequests.delete(key);
                        console.log('[Purro] ✅ Removed pending sign request:', key);
                        break;
                    }
                }
            } else {
                console.warn('[Purro] ⚠️ No pending sign request found for origin:', origin);
            }

            console.log('[Purro] ✅ Sign approval completed successfully');
            return {
                success: true,
                data: signature
            };
        } catch (error) {
            console.error('[Purro] ❌ Error in handleApproveSign:', error);

            // Clean up any pending requests on error
            const pendingSignRequest = Array.from(pendingSignRequests.values())
                .find(req => req.origin === data.origin);

            if (pendingSignRequest) {
                console.log('[Purro] 🧹 Cleaning up pending sign request due to error');
                pendingSignRequest.reject(error);
                for (const [key, req] of pendingSignRequests.entries()) {
                    if (req.origin === data.origin) {
                        pendingSignRequests.delete(key);
                        break;
                    }
                }
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to approve sign',
                code: 4001
            };
        }
    },

    async handleRejectSign(data: { origin: string }): Promise<MessageResponse> {
        try {
            const { origin } = data;

            // Find and reject the pending sign request
            const pendingSignRequest = Array.from(pendingSignRequests.values())
                .find(req => req.origin === origin);

            if (pendingSignRequest) {
                pendingSignRequest.reject(new Error('User rejected the request'));
                // Remove from pending requests
                for (const [key, req] of pendingSignRequests.entries()) {
                    if (req.origin === origin) {
                        pendingSignRequests.delete(key);
                        break;
                    }
                }
            }

            return {
                success: true,
                data: { rejected: true }
            };
        } catch (error) {
            console.error('Error in handleRejectSign:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reject sign',
                code: 4001
            };
        }
    },

    async handleSendTransaction(data: { transaction: TransactionRequest }, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
        console.log('[Purro] 🔄 Starting handleSendTransaction process...', data.transaction);

        try {
            const { transaction } = data;

            // Validate transaction data
            if (!transaction.to) {
                return {
                    success: false,
                    error: TRANSACTION_ERRORS.INVALID_TO_ADDRESS.message,
                    code: TRANSACTION_ERRORS.INVALID_TO_ADDRESS.code
                };
            }

            // Validate value if provided
            if (transaction.value) {
                try {
                    ethers.parseEther(transaction.value);
                } catch (error) {
                    return {
                        success: false,
                        error: TRANSACTION_ERRORS.INVALID_VALUE.message,
                        code: TRANSACTION_ERRORS.INVALID_VALUE.code
                    };
                }
            }

            // Check wallet state
            const { hasWallet } = await storageHandler.getWalletState();
            if (!hasWallet) {
                return {
                    success: false,
                    error: 'No wallet found',
                    code: 4001
                };
            }

            // Get active account
            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                return {
                    success: false,
                    error: 'No active account found',
                    code: 4001
                };
            }

            // Get wallet for the active account
            const wallet = await storageHandler.getWalletById(activeAccount.id);
            if (!wallet || !wallet.eip155) {
                return {
                    success: false,
                    error: 'EVM wallet not found for active account',
                    code: 4001
                };
            }

            // Set from address
            const transactionWithFrom = {
                ...transaction,
                from: wallet.eip155.address
            };

            // Get current chain ID
            const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_CHAIN_ID);
            const chainId = result[STORAGE_KEYS.CURRENT_CHAIN_ID] || '0x1';
            transactionWithFrom.chainId = chainId;

            // Estimate gas if not provided
            try {
                await this.estimateTransactionGas(transactionWithFrom, chainId);
            } catch (error) {
                console.error('[Purro] ❌ Gas estimation failed:', error);
                return {
                    success: false,
                    error: TRANSACTION_ERRORS.GAS_ESTIMATION_FAILED.message,
                    code: TRANSACTION_ERRORS.GAS_ESTIMATION_FAILED.code
                };
            }

            // Get origin and site info for the popup
            let origin = 'unknown';
            let favicon = '';
            let title = '';

            if (sender.tab?.url) {
                const url = new URL(sender.tab.url);
                origin = url.origin;
                favicon = sender.tab.favIconUrl || '';
                title = sender.tab.title || '';
            }

            // Create pending transaction request and show popup
            const transactionPromise = createPendingTransactionRequest(origin, transactionWithFrom, sender.tab?.id);

            const transactionUrl = chrome.runtime.getURL('html/transaction.html') +
                `?origin=${encodeURIComponent(origin)}&favicon=${encodeURIComponent(favicon)}&title=${encodeURIComponent(title)}&transaction=${encodeURIComponent(JSON.stringify(transactionWithFrom))}`;

            const popupConfig = await this.calculatePopupPosition(sender);
            await chrome.windows.create({
                url: transactionUrl,
                type: 'popup',
                width: popupConfig.width,
                height: popupConfig.height,
                focused: true,
                left: popupConfig.left,
                top: popupConfig.top,
            });

            const transactionResult = await transactionPromise;

            return {
                success: true,
                data: transactionResult,
            };

        } catch (error) {
            console.error('[Purro] ❌ Error in handleSendTransaction:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send transaction',
                code: 4001
            };
        }
    },

    async handleApproveTransaction(data: { origin: string; transaction: TransactionRequest }): Promise<MessageResponse> {
        console.log('[Purro] 🔄 Starting handleApproveTransaction process...', { origin: data.origin });

        try {
            const { origin, transaction } = data;

            // Get the active account
            const activeAccount = await storageHandler.getActiveAccount();
            if (!activeAccount) {
                console.error('[Purro] ❌ No active account found');
                return {
                    success: false,
                    error: 'No active account found',
                    code: 4001
                };
            }

            console.log('[Purro] ✅ Active account found:', activeAccount.id);

            // Get wallet to verify address matches
            const wallet = await storageHandler.getWalletById(activeAccount.id);
            if (!wallet || !wallet.eip155) {
                console.error('[Purro] ❌ EVM wallet not found for active account');
                return {
                    success: false,
                    error: 'EVM wallet not found for active account',
                    code: 4001
                };
            }

            console.log('[Purro] ✅ Wallet found:', wallet.eip155.address);

            // Get private key for signing
            let privateKey: string;
            try {
                console.log('[Purro] 🔄 Retrieving private key...');
                privateKey = await accountHandler.getPrivateKeyByAccountId(activeAccount.id);
                console.log('[Purro] ✅ Private key retrieved successfully');
            } catch (error) {
                console.error('[Purro] ❌ Failed to retrieve private key:', error);
                return {
                    success: false,
                    error: 'Failed to retrieve private key',
                    code: 4001
                };
            }

            // Create wallet instance for transaction
            const signerWallet = new ethers.Wallet(privateKey);

            // Get current chain info and create provider
            const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_CHAIN_ID);
            const chainId = result[STORAGE_KEYS.CURRENT_CHAIN_ID] || '0x1';
            const chainInfo = supportedEVMChains[chainId];

            if (!chainInfo) {
                return {
                    success: false,
                    error: 'Unsupported chain',
                    code: 4001
                };
            }

            // Create provider and connect wallet
            const provider = new ethers.JsonRpcProvider(chainInfo.rpcUrls[0]);
            const connectedWallet = signerWallet.connect(provider);

            console.log('[Purro] 🔄 Sending transaction...');

            // Send transaction - convert transaction to ethers format
            const ethersTransaction = {
                to: transaction.to,
                value: transaction.value ? (
                    transaction.value.startsWith('0x') 
                        ? BigInt(transaction.value) 
                        : ethers.parseEther(transaction.value)
                ) : undefined,
                data: transaction.data,
                gasLimit: transaction.gas ? BigInt(transaction.gas) : undefined,
                gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : undefined,
                maxFeePerGas: transaction.maxFeePerGas ? BigInt(transaction.maxFeePerGas) : undefined,
                maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? BigInt(transaction.maxPriorityFeePerGas) : undefined,
                nonce: transaction.nonce ? parseInt(transaction.nonce, 16) : undefined,
                type: transaction.type ? parseInt(transaction.type, 16) : undefined,
                chainId: transaction.chainId ? parseInt(transaction.chainId, 16) : undefined,
            };

            let txResponse: ethers.TransactionResponse;
            try {
                txResponse = await connectedWallet.sendTransaction(ethersTransaction);
                console.log('[Purro] ✅ Transaction sent:', txResponse.hash);
            } catch (error) {
                console.error('[Purro] ❌ Transaction failed:', error);
                return {
                    success: false,
                    error: TRANSACTION_ERRORS.TRANSACTION_FAILED.message,
                    code: TRANSACTION_ERRORS.TRANSACTION_FAILED.code
                };
            }

            // Resolve the pending transaction request
            const pendingTransaction = Array.from(pendingTransactionRequests.values())
                .find(req => req.origin === origin);

            if (pendingTransaction) {
                console.log('[Purro] ✅ Resolving pending transaction request for origin:', origin);
                pendingTransaction.resolve(txResponse.hash);
                // Remove from pending requests
                for (const [key, req] of pendingTransactionRequests.entries()) {
                    if (req.origin === origin) {
                        pendingTransactionRequests.delete(key);
                        console.log('[Purro] ✅ Removed pending transaction request:', key);
                        break;
                    }
                }
            } else {
                console.warn('[Purro] ⚠️ No pending transaction request found for origin:', origin);
            }

            console.log('[Purro] ✅ Transaction approval completed successfully');
            return {
                success: true,
                data: txResponse.hash
            };
        } catch (error) {
            console.error('[Purro] ❌ Error in handleApproveTransaction:', error);

            // Clean up any pending requests on error
            const pendingTransaction = Array.from(pendingTransactionRequests.values())
                .find(req => req.origin === data.origin);

            if (pendingTransaction) {
                console.log('[Purro] 🧹 Cleaning up pending transaction request due to error');
                pendingTransaction.reject(error);
                for (const [key, req] of pendingTransactionRequests.entries()) {
                    if (req.origin === data.origin) {
                        pendingTransactionRequests.delete(key);
                        break;
                    }
                }
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to approve transaction',
                code: 4001
            };
        }
    },

    async handleRejectTransaction(data: { origin: string }): Promise<MessageResponse> {
        try {
            const { origin } = data;

            // Find and reject the pending transaction request
            const pendingTransaction = Array.from(pendingTransactionRequests.values())
                .find(req => req.origin === origin);

            if (pendingTransaction) {
                pendingTransaction.reject(new Error(TRANSACTION_ERRORS.USER_REJECTED_TRANSACTION.message));
                // Remove from pending requests
                for (const [key, req] of pendingTransactionRequests.entries()) {
                    if (req.origin === origin) {
                        pendingTransactionRequests.delete(key);
                        break;
                    }
                }
            }

            return {
                success: true,
                data: { rejected: true }
            };
        } catch (error) {
            console.error('Error in handleRejectTransaction:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reject transaction',
                code: 4001
            };
        }
    },

    async estimateTransactionGas(transaction: TransactionRequest, chainId: string): Promise<MessageResponse> {
        const chainInfo = supportedEVMChains[chainId];
        if (!chainInfo) {
            throw new Error('Unsupported chain for gas estimation');
        }

        const provider = new ethers.JsonRpcProvider(chainInfo.rpcUrls[0]);

        try {
            // Estimate gas limit if not provided
            if (!transaction.gas) {
                const gasLimit = await provider.estimateGas({
                    to: transaction.to,
                    from: transaction.from,
                    value: transaction.value ? (
                        transaction.value.startsWith('0x') 
                            ? BigInt(transaction.value) 
                            : ethers.parseEther(transaction.value)
                    ) : undefined,
                    data: transaction.data
                });

                console.log("🔍 Gas limit:", gasLimit);

                // Add buffer to gas limit
                const bufferedGasLimit = Math.floor(Number(gasLimit) * GAS_LIMIT_BUFFER);
                transaction.gas = `0x${bufferedGasLimit.toString(16)}`;
            }

            // Get gas price if not provided
            if (!transaction.gasPrice && !transaction.maxFeePerGas) {
                try {
                    // Try to get EIP-1559 fees first
                    const feeData = await provider.getFeeData();
                    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                        transaction.maxFeePerGas = `0x${feeData.maxFeePerGas.toString(16)}`;
                        transaction.maxPriorityFeePerGas = `0x${feeData.maxPriorityFeePerGas.toString(16)}`;
                        transaction.type = '0x2'; // EIP-1559 transaction
                    } else if (feeData.gasPrice) {
                        transaction.gasPrice = `0x${feeData.gasPrice.toString(16)}`;
                        transaction.type = '0x0'; // Legacy transaction
                    }
                } catch (error) {
                    console.warn('Failed to get fee data, using legacy gas price');
                    const feeData = await provider.getFeeData();
                    if (feeData.gasPrice) {
                        transaction.gasPrice = `0x${feeData.gasPrice.toString(16)}`;
                        transaction.type = '0x0'; // Legacy transaction
                    }
                }
            }

            return {
                success: true,
                data: transaction
            };

        } catch (error) {
            console.error('Gas estimation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to estimate gas',
            };
        }
    },

    // Helper methods
    async closeExistingConnectPopups(): Promise<void> {
        try {
            const windows = await chrome.windows.getAll({ populate: true });
            for (const window of windows) {
                if (window.type === 'popup' && window.tabs) {
                    for (const tab of window.tabs) {
                        if (tab.url && tab.url.includes('connect.html')) {

                            if (window.id) {
                                await chrome.windows.remove(window.id);
                            }
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to close existing popups:', error);
        }
    },

    async calculatePopupPosition(sender: chrome.runtime.MessageSender): Promise<{
        width: number;
        height: number;
        left: number;
        top: number;
    }> {
        const popupWidth = 375;
        const popupHeight = 600;
        let left = 100;
        let top = 100;

        if (sender?.tab?.id) {
            try {
                const currentTab = await chrome.tabs.get(sender.tab.id);
                const window = await chrome.windows.get(currentTab.windowId);

                // Calculate position relative to the current tab
                left = (window.left || 0) + (window.width || 0) - popupWidth;
                top = window.top || 0;
            } catch (error) {
                // Use default position if tab info is not available
                console.warn('Could not calculate popup position, using defaults:', error);
            }
        }

        return {
            width: popupWidth,
            height: popupHeight,
            left,
            top
        };
    }
}

function createPendingConnection(origin: string, tabId?: number): Promise<any> {
    return new Promise((resolve, reject) => {
        const connectionId = `${origin}_${Date.now()}`;



        pendingConnections.set(connectionId, {
            origin,
            tabId,
            timestamp: Date.now(),
            resolve,
            reject,
        });



        // Auto-cleanup after 1 minutes
        setTimeout(() => {
            if (pendingConnections.has(connectionId)) {

                pendingConnections.delete(connectionId);
                reject(new Error('Connection request timeout - Please try connecting again'));
            }
        }, 1 * 60 * 1000);
    });
}

function createPendingSignRequest(origin: string, message: string, address: string, tabId?: number): Promise<any> {
    return new Promise((resolve, reject) => {
        const signRequestId = `${origin}_${Date.now()}`;

        pendingSignRequests.set(signRequestId, {
            origin,
            message,
            address,
            tabId,
            timestamp: Date.now(),
            resolve,
            reject,
        });

        // Auto-cleanup after 1 minute
        setTimeout(() => {
            if (pendingSignRequests.has(signRequestId)) {
                pendingSignRequests.delete(signRequestId);
                reject(new Error('Sign request timeout - Please try signing again'));
            }
        }, 1 * 60 * 1000);
    });
}

function createPendingTransactionRequest(origin: string, transaction: TransactionRequest, tabId?: number): Promise<any> {
    return new Promise((resolve, reject) => {
        const transactionRequestId = `${origin}_${Date.now()}`;

        pendingTransactionRequests.set(transactionRequestId, {
            origin,
            transaction,
            tabId,
            timestamp: Date.now(),
            resolve,
            reject,
        });

        // Auto-cleanup after transaction timeout
        setTimeout(() => {
            if (pendingTransactionRequests.has(transactionRequestId)) {
                pendingTransactionRequests.delete(transactionRequestId);
                reject(new Error('Transaction request timeout - Please try again'));
            }
        }, TRANSACTION_TIMEOUT);
    });
}