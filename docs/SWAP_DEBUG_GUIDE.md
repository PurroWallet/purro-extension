# Swap Debug Guide

## Overview
This guide helps you debug swap-related issues in the Purro extension.

## Debug Configuration

### Client-side Logging
In `src/client/utils/swap-transaction-handler.ts`, you can control logging with:

```typescript
const SWAP_CONSTANTS = {
  DEBUG: {
    ENABLED: true, // Set to false to disable detailed logging
    LOG_TRANSACTION_DATA: true, // Set to false to hide sensitive transaction data
  },
}
```

### Error Display Configuration
In `src/client/components/swap-action-button.tsx`, you can control error display with:

```typescript
const ERROR_CONFIG = {
  SHOW_DETAILED_ERRORS: true, // Set to false to show generic messages only
  USER_REJECTION_KEYWORDS: ['user rejected', 'User denied', 'user denied transaction'],
  GENERIC_MESSAGE: 'Transaction failed. Please try again.',
}
```

## Common Swap Issues and Debugging

### 1. "Unconfigured Name" Error
**Symptoms**: Error message contains "unconfigured name (value="", code=UNCONFIGURED_NAME)"
**Cause**: Empty or invalid address being passed to ethers contract calls
**Debug**: Check console logs for:
- `[Purro] 🔍 Background: Owner address found for allowance:`
- `[Purro] 📞 Background: Calling contract.allowance with:`

### 2. Token Allowance Issues
**Symptoms**: Swap fails during approval step
**Debug logs to check**:
```
[Purro] 🔒 Checking token allowance for ERC20 token...
[Purro] 📞 Calling EVM_CHECK_TOKEN_ALLOWANCE with:
[Purro] 📋 Allowance result:
[Purro] 💰 Allowance comparison:
```

### 3. Transaction Execution Failures
**Symptoms**: Swap fails during final transaction step
**Debug logs to check**:
```
[Purro] 🚀 Background: Sending transaction with params:
[Purro] ✅ Background: Transaction sent successfully:
```

## Log Categories

### Client-side Logs (Console)
- 🔄 Starting operations
- 📊 Analysis and validation
- 🔒 Token allowance operations
- 🔍 Data lookups
- 📞 API/message calls
- 📋 Results and responses
- 💰 Balance and amount calculations
- 🚀 Transaction execution
- ✅ Success operations
- ❌ Error operations
- ⏭️ Skipped operations

### Background Script Logs (Service Worker Console)
- 🔄 Background: Starting operations
- 🔍 Background: Data retrieval
- ✅ Background: Success operations
- ❌ Background: Error operations
- 📞 Background: Contract calls
- 🚀 Background: Transaction sending

## How to Debug

1. **Open Browser Developer Tools**
   - For extension popup: Right-click on extension icon → Inspect popup
   - For background script: Go to chrome://extensions → Developer mode → Inspect views: service worker

2. **Enable Debug Logging**
   - Set `SWAP_CONSTANTS.DEBUG.ENABLED = true`
   - Set `ERROR_CONFIG.SHOW_DETAILED_ERRORS = true`

3. **Reproduce the Issue**
   - Try the swap operation that's failing
   - Watch both console logs (popup and background)

4. **Analyze the Logs**
   - Look for the last successful operation before failure
   - Check error details in the logs
   - Compare expected vs actual values

## Example Debug Session

```
// Client console
[Purro] 🔄 Starting swap transaction: {tokenIn: {...}, tokenOut: {...}}
[Purro] 📊 Transaction type analysis: {isDirectWrapUnwrapScenario: false, ...}
[Purro] 🔒 Checking token allowance for ERC20 token...
[Purro] 📞 Calling EVM_CHECK_TOKEN_ALLOWANCE with: {tokenAddress: "0x...", ...}

// Background console
[Purro] 🔄 Background: Starting checkTokenAllowance with: {tokenAddress: "0x..."}
[Purro] 🔍 Background: Getting active account for allowance check...
[Purro] ✅ Background: Active account found for allowance: Account 1
[Purro] 📞 Background: Calling contract.allowance with: {tokenAddress: "0x...", ownerAddress: "0x...", spenderAddress: "0x..."}
```

## Production Configuration

For production builds, set:
```typescript
DEBUG: {
  ENABLED: false,
  LOG_TRANSACTION_DATA: false,
},
ERROR_CONFIG: {
  SHOW_DETAILED_ERRORS: false,
}
```

This will reduce console noise and hide sensitive information while still logging critical errors. 