/**
 * Message types for communication between client and background script
 */
export const MESSAGE_TYPES = {
    GET_ACCOUNTS: 'GET_ACCOUNTS',
    CREATE_ACCOUNT: 'CREATE_ACCOUNT',
    DELETE_ACCOUNT: 'DELETE_ACCOUNT',
    // EVM Signing
    ETH_APPROVE_SIGN: 'ETH_APPROVE_SIGN',
    ETH_REJECT_SIGN: 'ETH_REJECT_SIGN',
    EVM_PERSONAL_SIGN: 'EVM_PERSONAL_SIGN',
    // EVM Typed Data Signing
    EVM_SIGN_TYPED_DATA: 'EVM_SIGN_TYPED_DATA',
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

/**
 * Error codes for message responses
 */
export const ERROR_CODES = {
    UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
    INVALID_PARAMETERS: 'INVALID_PARAMETERS',
    WALLET_LOCKED: 'WALLET_LOCKED',
    ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    SIGNATURE_FAILED: 'SIGNATURE_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Signing error constants for consistent error handling
 */
export const SIGNING_ERRORS = {
    SESSION_EXPIRED: {
        code: 4001,
        message: 'Wallet session expired. Please unlock your wallet and try again.',
        retryable: true
    },
    WALLET_LOCKED: {
        code: 4001,
        message: 'Wallet is locked. Please unlock your wallet first.',
        retryable: true
    },
    NO_ACTIVE_ACCOUNT: {
        code: 4001,
        message: 'No active account found. Please select an account.',
        retryable: false
    },
    ACCOUNT_NOT_FOUND: {
        code: 4001,
        message: 'Account not found. Please check your account settings.',
        retryable: false
    },
    EVM_WALLET_NOT_FOUND: {
        code: 4001,
        message: 'EVM wallet not found for active account.',
        retryable: false
    },
    ADDRESS_MISMATCH: {
        code: 4001,
        message: 'Address does not match active account.',
        retryable: false
    },
    PRIVATE_KEY_ACCESS_FAILED: {
        code: 4001,
        message: 'Failed to access private key. Please ensure your wallet is unlocked.',
        retryable: true
    },
    INVALID_PRIVATE_KEY: {
        code: 4001,
        message: 'Invalid private key format.',
        retryable: false
    },
    SIGNING_FAILED: {
        code: 4001,
        message: 'Message signing failed. Please try again.',
        retryable: true
    },
    EIP712_SIGNING_FAILED: {
        code: 4001,
        message: 'EIP-712 typed data signing failed. Please check the message format.',
        retryable: true
    },
    USER_REJECTED: {
        code: 4001,
        message: 'User rejected the signing request.',
        retryable: false
    },
    SESSION_STORAGE_UNAVAILABLE: {
        code: 4001,
        message: 'Secure session storage unavailable. Please restart the extension.',
        retryable: true
    },
    OFFSCREEN_TIMEOUT: {
        code: 4001,
        message: 'Secure session storage timeout. Please unlock your wallet again.',
        retryable: true
    }
} as const;

export type SigningErrorType = keyof typeof SIGNING_ERRORS; 