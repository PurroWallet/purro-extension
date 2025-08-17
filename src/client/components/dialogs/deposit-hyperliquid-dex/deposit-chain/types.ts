// Bridge2 Deposit Types

export type DepositStep = 'input' | 'confirm' | 'pending' | 'success' | 'error';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface DepositTransaction {
  txHash: string;
  amount: string;
  timestamp: number;
  status: TransactionStatus;
  network: 'arbitrum';
}

export interface BridgeDepositRequest {
  amount: number;
  bridgeAddress: string;
}

export interface BridgeDepositResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface TransactionStatusRequest {
  txHash: string;
  network: 'arbitrum';
}

export interface TransactionStatusResponse {
  confirmed: boolean;
  failed: boolean;
  blockNumber?: number;
  gasUsed?: string;
}

export interface ArbitrumUSDCBalanceResponse {
  balance: number;
  decimals: number;
  symbol: string;
}

// Component Props
export interface DepositChainProps {
  onClose?: () => void;
}

export interface InputAmountProps {
  onNext?: (amount: string) => void;
  onCancel?: () => void;
}

export interface PendingProps {
  txHash: string;
  amount: string;
  onConfirmed?: () => void;
  onFailed?: (error: string) => void;
}

export interface SuccessProps {
  txHash: string;
  amount: string;
  onClose?: () => void;
}

export interface ErrorProps {
  error: string;
  amount?: string;
  txHash?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

// Validation
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface DepositValidation {
  amount: ValidationResult;
  balance: ValidationResult;
  network: ValidationResult;
}

// Bridge Configuration
export interface BridgeConfig {
  contractAddress: string;
  minDeposit: number;
  maxDeposit?: number;
  sourceChain: string;
  destinationChain: string;
  supportedTokens: string[];
  processingTime: string;
  explorerUrl: string;
}

// Error Types
export type DepositError = 
  | 'INSUFFICIENT_BALANCE'
  | 'BELOW_MINIMUM'
  | 'ABOVE_MAXIMUM'
  | 'INVALID_AMOUNT'
  | 'NETWORK_ERROR'
  | 'USER_REJECTED'
  | 'TRANSACTION_FAILED'
  | 'UNKNOWN_ERROR';

export interface DepositErrorInfo {
  type: DepositError;
  message: string;
  details?: string;
  recoverable: boolean;
}
