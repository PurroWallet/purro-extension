// Loading state constants
export const LOADING_STATES = {
    TOKEN_SYMBOL: 'LOADING',
    SWAP_INFO: 'Loading swap info...',
    TOKEN_INFO: 'Loading token info...',
    AMOUNT: 'Loading...',
    UNKNOWN: 'Unknown',
} as const;

// Transaction method labels
export const METHOD_LABELS = {
    SWAP: 'Swapped',
    SEND: 'Sent',
    WITHDRAW: 'Withdrew',
    DEPOSIT: 'Deposited',
    RECEIVE: 'Received',
    DEFAULT: 'Transaction',
} as const;

// Method colors
export const METHOD_COLORS = {
    SWAP: 'text-[var(--primary-color-light)]',
    SEND: 'text-red-400',
    WITHDRAW: 'text-red-400',
    DEPOSIT: 'text-green-400',
    RECEIVE: 'text-green-400',
    DEFAULT: 'text-red-400',
} as const;

// Method indicator colors
export const METHOD_INDICATOR_COLORS = {
    SWAP: 'bg-[var(--primary-color-light)]',
    SEND: 'bg-red-400',
    WITHDRAW: 'bg-red-400',
    DEPOSIT: 'bg-green-400',
    RECEIVE: 'bg-green-400',
    DEFAULT: 'bg-red-400',
} as const;

// Loading UI constants
export const LOADING_UI = {
    OPACITY: 'opacity-60',
    CURSOR: 'cursor-not-allowed',
    LOADING_TEXT: '(Loading...)',
    SPINNER_SIZE: {
        SMALL: 'w-2 h-2',
        MEDIUM: 'w-3 h-3',
    },
} as const;

// Skeleton constants
export const SKELETON = {
    ANIMATION: 'animate-pulse',
    COLORS: {
        LIGHT: 'bg-gray-300',
        DARK: 'dark:bg-gray-600',
        INDICATOR_LIGHT: 'bg-gray-400',
        INDICATOR_DARK: 'dark:bg-gray-500',
    },
    SIZES: {
        METHOD_LABEL: 'h-4 w-16',
        TOKEN_NAME: 'h-4 w-32',
        TIME: 'h-3 w-20',
        AMOUNT: 'h-4 w-24',
        SWAP_AMOUNT: 'h-4 w-20',
        SWAP_INFO: 'h-4 w-40',
        CHAIN_NAME: 'h-3 w-12',
    },
} as const;

// Explorer URLs
export const EXPLORER_URLS = {
    ethereum: 'https://etherscan.io',
    arbitrum: 'https://arbiscan.io',
    base: 'https://basescan.org',
    hyperevm: 'https://hyperevmscan.io',
} as const;

// Explorer names
export const EXPLORER_NAMES = {
    ethereum: 'View on Etherscan',
    arbitrum: 'View on Arbiscan',
    base: 'View on BaseScan',
    hyperevm: 'View on Explorer',
} as const; 