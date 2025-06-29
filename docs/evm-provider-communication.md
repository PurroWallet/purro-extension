# EVM Provider Communication Methods

Purro EVM Provider hỗ trợ nhiều cách để dApps giao tiếp với wallet, đảm bảo tương thích với tất cả các tiêu chuẩn từ cũ đến mới.

## 📋 Tổng quan các Methods

| Method        | Standard     | Status        | Mô tả                        |
| ------------- | ------------ | ------------- | ---------------------------- |
| `request()`   | EIP-1193     | ✅ Recommended | Modern async/await API       |
| `send()`      | Legacy       | ✅ Supported   | Simplified legacy method     |
| `sendAsync()` | Legacy       | ✅ Supported   | Callback-based legacy method |
| `enable()`    | Pre-EIP-1193 | ✅ Supported   | Very old connection method   |

## 1. 🎯 `request()` Method (EIP-1193 Standard)

**Đây là method chính và được khuyến nghị sử dụng.**

### Syntax
```typescript
provider.request(args: RequestArguments): Promise<unknown>

interface RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}
```

### Usage Examples

#### Basic RPC Calls
```javascript
// Get chain ID
const chainId = await provider.request({ method: 'eth_chainId' });

// Get accounts
const accounts = await provider.request({ method: 'eth_accounts' });

// Request account access
const accounts = await provider.request({ method: 'eth_requestAccounts' });

// Get balance
const balance = await provider.request({
  method: 'eth_getBalance',
  params: ['0x742d35Cc6634C0532925a3b8D4c4d6F6e8d65c12', 'latest']
});
```

#### Transaction Operations
```javascript
// Send transaction
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{
    from: '0x...',
    to: '0x742d35Cc6634C0532925a3b8D4c4d6F6e8d65c12',
    value: '0x5af3107a4000', // 0.0001 ETH
    gas: '0x5208',
    gasPrice: '0x9184e72a000'
  }]
});
```

#### Signing Operations
```javascript
// Personal sign
const signature = await provider.request({
  method: 'personal_sign',
  params: ['Hello World!', '0x...']
});

// Sign typed data (EIP-712)
const typedSignature = await provider.request({
  method: 'eth_signTypedData_v4',
  params: ['0x...', JSON.stringify(typedData)]
});
```

#### Wallet Operations
```javascript
// Add new chain
await provider.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com']
  }]
});

// Switch chain
await provider.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x89' }]
});
```

### Error Handling
```javascript
try {
  const result = await provider.request({ method: 'eth_requestAccounts' });
} catch (error) {
  if (error.code === 4001) {
    console.log('User rejected the request');
  } else if (error.code === 4100) {
    console.log('Unauthorized');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 2. 🔧 `send()` Method (Legacy Compatibility)

**Simplified legacy method, internally calls `request()`.**

### Syntax
```typescript
provider.send(method: string, params?: any[]): Promise<any>
```

### Usage Examples
```javascript
// Basic calls
const chainId = await provider.send('eth_chainId');
const accounts = await provider.send('eth_requestAccounts');

// With parameters
const balance = await provider.send('eth_getBalance', [
  '0x742d35Cc6634C0532925a3b8D4c4d6F6e8d65c12', 
  'latest'
]);

// Send transaction
const txHash = await provider.send('eth_sendTransaction', [{
  from: '0x...',
  to: '0x742d35Cc6634C0532925a3b8D4c4d6F6e8d65c12',
  value: '0x5af3107a4000'
}]);
```

### Implementation Detail
```typescript
async send(method: string, params?: any[]): Promise<any> {
  return await this.request({ method, params });
}
```

## 3. 📞 `sendAsync()` Method (Callback-based Legacy)

**Callback-based method for very old dApps.**

### Syntax
```typescript
provider.sendAsync(
  payload: JsonRpcRequest, 
  callback: (error: any, result: any) => void
): void

interface JsonRpcRequest {
  id: string | number;
  jsonrpc: "2.0";
  method: string;
  params?: any[];
}
```

### Usage Examples
```javascript
// Basic call
provider.sendAsync({
  id: 1,
  jsonrpc: '2.0',
  method: 'eth_chainId',
  params: []
}, (error, result) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Chain ID:', result.result);
  }
});

// Request accounts
provider.sendAsync({
  id: 2,
  jsonrpc: '2.0',
  method: 'eth_requestAccounts',
  params: []
}, (error, result) => {
  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('Connected accounts:', result.result);
  }
});

// Send transaction
provider.sendAsync({
  id: 3,
  jsonrpc: '2.0',
  method: 'eth_sendTransaction',
  params: [{
    from: '0x...',
    to: '0x742d35Cc6634C0532925a3b8D4c4d6F6e8d65c12',
    value: '0x5af3107a4000'
  }]
}, (error, result) => {
  if (error) {
    console.error('Transaction failed:', error);
  } else {
    console.log('Transaction hash:', result.result);
  }
});
```

### Promise Wrapper
```javascript
// Convert to Promise for easier handling
function sendAsyncPromise(provider, payload) {
  return new Promise((resolve, reject) => {
    provider.sendAsync(payload, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result.result);
      }
    });
  });
}

// Usage
const chainId = await sendAsyncPromise(provider, {
  id: 1,
  jsonrpc: '2.0',
  method: 'eth_chainId',
  params: []
});
```

## 4. 🔌 `enable()` Method (Pre-EIP-1193)

**Very old connection method, equivalent to `eth_requestAccounts`.**

### Syntax
```typescript
provider.enable(): Promise<string[]>
```

### Usage Examples
```javascript
// Connect to wallet (old way)
try {
  const accounts = await provider.enable();
  console.log('Connected accounts:', accounts);
} catch (error) {
  console.error('Connection failed:', error);
}

// Modern equivalent
const accounts = await provider.request({ method: 'eth_requestAccounts' });
```

### Implementation Detail
```typescript
async enable(): Promise<string[]> {
  return await this.requestAccounts();
}
```

## 🎭 Event System

Ngoài các methods trên, provider còn có event system để lắng nghe thay đổi:

### Event Listeners
```javascript
// Listen for account changes
provider.on('accountsChanged', (accounts) => {
  console.log('Accounts changed:', accounts);
  if (accounts.length === 0) {
    // User disconnected
    handleDisconnect();
  }
});

// Listen for chain changes
provider.on('chainChanged', (chainId) => {
  console.log('Chain changed to:', chainId);
  // Reload page or update UI
  window.location.reload();
});

// Listen for connection
provider.on('connect', ({ chainId }) => {
  console.log('Connected to chain:', chainId);
});

// Listen for disconnection
provider.on('disconnect', (error) => {
  console.log('Disconnected:', error);
});
```

### Remove Listeners
```javascript
const accountsHandler = (accounts) => {
  console.log('Accounts:', accounts);
};

// Add listener
provider.on('accountsChanged', accountsHandler);

// Remove listener
provider.removeListener('accountsChanged', accountsHandler);
```

## 📊 Communication Flow

```mermaid
graph TD
    A[dApp] --> B{Choose Method}
    B -->|Modern| C[request()]
    B -->|Legacy| D[send()]
    B -->|Callback| E[sendAsync()]
    B -->|Very Old| F[enable()]
    
    C --> G[Process Request]
    D --> G
    E --> G
    F --> G
    
    G --> H[Chrome Runtime Message]
    H --> I[Background Script]
    I --> J[User Confirmation]
    J --> K[Response]
    K --> L[Return to dApp]
    
    M[Provider Events] --> N[Event Listeners]
    N --> O[dApp Updates]
```

## 🔄 Data Flow Examples

### 1. Account Request Flow
```javascript
// dApp initiates
const accounts = await provider.request({ method: 'eth_requestAccounts' });

// Internal flow:
// 1. provider.request() called
// 2. chrome.runtime.sendMessage({ type: 'REQUEST_ACCOUNTS', origin: ... })
// 3. Background script processes request
// 4. User sees popup for confirmation
// 5. User approves/rejects
// 6. Response sent back to provider
// 7. Provider updates state and emits events
// 8. Promise resolves with accounts
```

### 2. Transaction Flow
```javascript
// dApp initiates
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{ from: '0x...', to: '0x...', value: '0x...' }]
});

// Internal flow:
// 1. provider.request() called
// 2. Check if connected
// 3. chrome.runtime.sendMessage({ type: 'SEND_TRANSACTION', ... })
// 4. Background script validates transaction
// 5. User sees transaction confirmation popup
// 6. User approves/rejects
// 7. If approved, transaction is broadcast
// 8. Transaction hash returned to provider
// 9. Promise resolves with hash
```

## 🛡️ Security Considerations

### Origin Validation
```javascript
// Provider always includes origin in requests
const response = await chrome.runtime.sendMessage({
  type: 'REQUEST_ACCOUNTS',
  origin: window.location.origin  // Always included
});
```

### User Confirmation
- Tất cả sensitive operations yêu cầu user confirmation
- Transactions, signing operations luôn show popup
- User có thể reject bất kỳ request nào

### Permission Management
```javascript
// Check permissions
const permissions = await provider.request({ method: 'wallet_getPermissions' });

// Request specific permissions
const newPermissions = await provider.request({
  method: 'wallet_requestPermissions',
  params: [{ eth_accounts: {} }]
});
```

## 📈 Best Practices

### 1. Use Modern Methods
```javascript
// ✅ Good - Modern EIP-1193
const accounts = await provider.request({ method: 'eth_requestAccounts' });

// ❌ Avoid - Very old method
const accounts = await provider.enable();
```

### 2. Proper Error Handling
```javascript
// ✅ Good - Handle specific errors
try {
  const result = await provider.request({ method: 'eth_requestAccounts' });
} catch (error) {
  switch (error.code) {
    case 4001:
      console.log('User rejected');
      break;
    case 4100:
      console.log('Unauthorized');
      break;
    default:
      console.error('Unexpected error:', error);
  }
}
```

### 3. Event Handling
```javascript
// ✅ Good - Listen for important events
provider.on('accountsChanged', handleAccountsChanged);
provider.on('chainChanged', handleChainChanged);
provider.on('disconnect', handleDisconnect);

// Clean up listeners when component unmounts
provider.removeListener('accountsChanged', handleAccountsChanged);
```

### 4. Connection State Management
```javascript
// ✅ Good - Check connection state
if (provider.isConnected) {
  const accounts = await provider.request({ method: 'eth_accounts' });
} else {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
}
```

## 🔍 Debugging

### Enable Logging
```javascript
// Provider logs all operations
console.log('Provider info:', provider.info);
console.log('Connected:', provider.isConnected);
console.log('Chain ID:', provider.chainId);
console.log('Selected address:', provider.selectedAddress);
```

### Test Methods
```javascript
// Test all communication methods
window.purroDemo.runAllDemos();

// Test specific functionality
import { testProvider } from '../utils/provider-test';
await testProvider(provider);
```

Tất cả các methods này đều được implement trong `PurroEVMProvider` và đảm bảo tương thích với các dApps từ cũ đến mới! 