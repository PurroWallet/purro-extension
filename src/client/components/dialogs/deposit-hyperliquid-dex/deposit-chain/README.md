# Hyperliquid Bridge2 Implementation

This directory contains the implementation of the Hyperliquid Bridge2 deposit functionality, allowing users to bridge USDC from Arbitrum to Hyperliquid.

## Overview

The Bridge2 is the official bridge between Hyperliquid and Arbitrum. Users can send native USDC to the bridge contract, and it gets credited to their Hyperliquid account in less than 1 minute.

### Key Information

- **Bridge Contract**: `0x2df1c51e09aecf9cacb7bc98cb1742757f163df7`
- **Source Chain**: Arbitrum
- **Destination**: Hyperliquid
- **Supported Token**: USDC
- **Minimum Deposit**: 5 USDC
- **Processing Time**: < 1 minute
- **Contract Source**: [GitHub](https://github.com/hyperliquid-dex/contracts/blob/master/Bridge2.sol)

## Architecture

### Components

1. **`index.tsx`** - Main orchestrator component that manages the deposit flow
2. **`input-amount.tsx`** - Input form for deposit amount with validation
3. **`pending.tsx`** - Shows transaction pending status with monitoring
4. **`success.tsx`** - Success confirmation with transaction details
5. **`error.tsx`** - Error handling with retry functionality
6. **`constants.ts`** - Shared constants and configuration

### State Management

The implementation uses Zustand for state management via `use-deposit-chain-store.ts`:

```typescript
interface DepositChainState {
  step: 'input' | 'confirm' | 'pending' | 'success' | 'error';
  amount: string;
  txHash: string | null;
  error: string | null;
  isLoading: boolean;
  // ... methods
}
```

### Flow States

1. **Input** - User enters deposit amount and confirms
2. **Pending** - Transaction submitted, waiting for confirmation
3. **Success** - Transaction confirmed, funds will be credited
4. **Error** - Transaction failed, user can retry

## Features

### Input Validation

- Minimum deposit amount (5 USDC)
- Maximum amount based on user's USDC balance
- Real-time balance fetching from Arbitrum
- Clear error messages for invalid inputs

### Transaction Monitoring

- Real-time transaction status checking
- Automatic progression from pending to success
- Transaction hash display with copy/view functionality
- Elapsed time tracking

### User Experience

- Clear visual feedback for each state
- Informational cards explaining the process
- Warning about minimum deposit requirements
- Links to block explorer for transaction verification

### Error Handling

- Comprehensive error messages
- Retry functionality for failed transactions
- Common issues explanation
- Graceful fallbacks for network issues

## Backend Integration

The component communicates with the backend through extension messages:

### Required Backend Messages

1. **`GET_ARBITRUM_USDC_BALANCE`** - Fetch user's USDC balance on Arbitrum
2. **`DEPOSIT_TO_HYPERLIQUID_BRIDGE`** - Execute the bridge deposit transaction
3. **`CHECK_TRANSACTION_STATUS`** - Monitor transaction confirmation status

### Message Payloads

```typescript
// Deposit transaction
{
  amount: number,
  bridgeAddress: string
}

// Transaction status check
{
  txHash: string,
  network: 'arbitrum'
}
```

## Security Considerations

### Validation

- Client-side validation for amount limits
- Server-side validation should mirror client rules
- Transaction hash verification

### User Safety

- Clear warnings about minimum deposit
- Prominent display of bridge contract address
- Transaction confirmation before submission

## Usage

The component is integrated into the deposit dialog system:

```typescript
import DepositChain from './deposit-chain';

// Used in dialog routing
const renderDepositDialog = () => {
  return <DepositChain />;
};
```

## Styling

The component uses the project's design system:

- CSS custom properties for theming
- Consistent spacing and typography
- Responsive design patterns
- Accessibility considerations

## Testing Considerations

### Unit Tests

- State management logic
- Validation functions
- Error handling scenarios

### Integration Tests

- Backend message communication
- Transaction flow end-to-end
- Error recovery scenarios

### Manual Testing

- Test with various amounts (below/above minimum)
- Test with insufficient balance
- Test transaction failures
- Test network connectivity issues

## Future Enhancements

1. **Gas Estimation** - Show estimated gas costs
2. **Transaction History** - Track previous deposits
3. **Multi-token Support** - If bridge expands beyond USDC
4. **Advanced Monitoring** - More detailed transaction status
5. **Batch Deposits** - Support for multiple deposits

## Troubleshooting

### Common Issues

1. **"Insufficient balance"** - User needs more USDC on Arbitrum
2. **"Below minimum"** - Amount must be at least 5 USDC
3. **"Transaction failed"** - Network issues or user rejection
4. **"Funds not credited"** - Wait up to 1 minute, check Hyperliquid balance

### Debug Information

The component logs relevant information to the console for debugging:

- Balance fetch errors
- Transaction submission results
- Status check responses
