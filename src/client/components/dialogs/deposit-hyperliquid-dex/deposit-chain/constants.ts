// Hyperliquid Bridge2 Constants
export const BRIDGE_CONTRACT_ADDRESS =
  '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';
export const MIN_DEPOSIT_AMOUNT = 5; // USDC
export const ARBITRUM_CHAIN_ID = 42161;
export const USDC_CONTRACT_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // USDC on Arbitrum

// Bridge Information
export const BRIDGE_INFO = {
  name: 'Hyperliquid Bridge2',
  description: 'Bridge USDC from Arbitrum to Hyperliquid',
  contractAddress: BRIDGE_CONTRACT_ADDRESS,
  sourceChain: 'Arbitrum',
  destinationChain: 'Hyperliquid',
  supportedTokens: ['USDC'],
  minDeposit: MIN_DEPOSIT_AMOUNT,
  maxProcessingTime: '1 minute',
  explorerUrl: 'https://arbiscan.io',
  githubUrl:
    'https://github.com/hyperliquid-dex/contracts/blob/master/Bridge2.sol',
} as const;

// Transaction Status
export const TX_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: 'Insufficient USDC balance',
  BELOW_MINIMUM: `Minimum deposit is ${MIN_DEPOSIT_AMOUNT} USDC`,
  TRANSACTION_FAILED: 'Transaction failed',
  NETWORK_ERROR: 'Network error occurred',
  USER_REJECTED: 'Transaction rejected by user',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;
