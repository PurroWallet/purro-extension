# Purro EVM Provider

Purro EVM Provider là implementation của EIP-1193 (Ethereum Provider JavaScript API) và EIP-6963 (Multi Injected Provider Discovery) cho Purro Wallet, cho phép dApps phát hiện và tương tác với wallet một cách chuẩn.

## 🎯 Tính năng chính

### EIP-1193 Support
- ✅ `request()` method với đầy đủ RPC methods
- ✅ Event system (connect, disconnect, accountsChanged, chainChanged)
- ✅ Legacy methods compatibility (`enable()`, `send()`, `sendAsync()`)
- ✅ Proper error codes và error handling

### EIP-6963 Support  
- ✅ Provider discovery mechanism
- ✅ Multiple provider support
- ✅ Unique provider identification
- ✅ Event-based announcement system

### Supported RPC Methods
- `eth_requestAccounts` - Request account access
- `eth_accounts` - Get connected accounts
- `eth_chainId` - Get current chain ID
- `net_version` - Get network version
- `eth_getBalance` - Get account balance
- `eth_sendTransaction` - Send transaction
- `personal_sign` - Sign message
- `eth_signTypedData_v4` - Sign typed data (EIP-712)
- `wallet_addEthereumChain` - Add new chain
- `wallet_switchEthereumChain` - Switch chain
- `wallet_getPermissions` - Get permissions
- `wallet_requestPermissions` - Request permissions

## 🏗️ Architecture

```
src/
├── types/
│   └── evm-provider.ts          # EIP-1193 & EIP-6963 types
├── background/
│   ├── providers/
│   │   ├── evm-provider.ts      # Main provider implementation
│   │   ├── content-script.ts    # Content script injection
│   │   ├── provider-manager.ts  # Provider management
│   │   └── demo.ts             # Usage examples
│   └── utils/
│       └── provider-test.ts     # Testing utilities
```

## 🚀 Cách sử dụng

### 1. EIP-6963 Provider Discovery (Recommended)

```javascript
// Listen for provider announcements
const providers = [];
window.addEventListener('eip6963:announceProvider', (event) => {
  providers.push(event.detail);
});

// Request providers to announce themselves
window.dispatchEvent(new CustomEvent('eip6963:requestProvider'));

// Find Purro Wallet
const purroProvider = providers.find(p => p.info.rdns === 'com.purro.wallet');
if (purroProvider) {
  const provider = purroProvider.provider;
  
  // Connect to wallet
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  console.log('Connected accounts:', accounts);
}
```

### 2. Legacy Detection

```javascript
// Check window.ethereum
if (window.ethereum?.info?.rdns === 'com.purro.wallet') {
  const provider = window.ethereum;
  // Use provider...
}

// Or check window.purro
if (window.purro) {
  const provider = window.purro;
  // Use provider...
}
```

### 3. Basic Operations

```javascript
// Get provider (assuming already detected)
const provider = window.purro;

// Connect
const accounts = await provider.request({ method: 'eth_requestAccounts' });

// Get chain info
const chainId = await provider.request({ method: 'eth_chainId' });
const networkVersion = await provider.request({ method: 'net_version' });

// Send transaction
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x742d35Cc6634C0532925a3b8D4c4d6F6e8d65c12',
    value: '0x5af3107a4000', // 0.0001 ETH
    gas: '0x5208'
  }]
});

// Sign message
const signature = await provider.request({
  method: 'personal_sign',
  params: ['Hello World!', accounts[0]]
});
```

### 4. Event Handling

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

### 5. Chain Management

```javascript
// Add a new chain
await provider.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x89', // Polygon
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com']
  }]
});

// Switch to the new chain
await provider.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x89' }]
});
```

## 🧪 Testing

Để test provider, sử dụng utility functions:

```javascript
import { testProvider } from './src/background/utils/provider-test';
import { PurroEVMProvider } from './src/background/providers/evm-provider';

const provider = new PurroEVMProvider();
const testResults = await testProvider(provider);
console.log('All tests passed:', testResults);
```

Hoặc sử dụng demo trong browser:

```javascript
// Trong console của browser
window.purroDemo.runAllDemos();
```

## 🔧 Development

### Setup
```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Watch mode
pnpm run build:watch
```

### Content Script Integration

Provider được inject vào web pages thông qua content script:

```javascript
// src/background/providers/content-script.ts
import { PurroEVMProvider } from './evm-provider';

const purroProvider = new PurroEVMProvider();

// EIP-6963 announcement
function announceProvider() {
  const event = new CustomEvent('eip6963:announceProvider', {
    detail: purroProvider.getProviderDetail()
  });
  window.dispatchEvent(event);
}

// Legacy injection
if (!window.ethereum) {
  window.ethereum = purroProvider;
}
window.purro = purroProvider;
```

## 📋 Error Codes

Provider sử dụng standard EIP-1193 error codes:

- `4001` - User rejected request
- `4100` - Unauthorized
- `4200` - Unsupported method
- `4900` - Disconnected
- `4901` - Chain disconnected
- `-32602` - Invalid params
- `-32603` - Internal error

## 🔐 Security Considerations

1. **Origin validation**: Provider kiểm tra origin của requests
2. **User confirmation**: Tất cả sensitive operations yêu cầu user confirmation
3. **Permission system**: Implement proper permission management
4. **Event validation**: Validate tất cả events trước khi emit

## 🌐 Supported Chains

Default supported chains:
- Ethereum Mainnet (`0x1`)
- Polygon Mainnet (`0x89`) 
- Arbitrum One (`0xa4b1`)

Có thể thêm chains mới thông qua `wallet_addEthereumChain`.

## 📚 Standards Compliance

- ✅ [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193): Ethereum Provider JavaScript API
- ✅ [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963): Multi Injected Provider Discovery
- ✅ [EIP-712](https://eips.ethereum.org/EIPS/eip-712): Typed structured data hashing and signing
- ✅ [EIP-3326](https://eips.ethereum.org/EIPS/eip-3326): Wallet Switch Ethereum Chain RPC Method

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Implement changes với proper tests
4. Submit pull request

## 📄 License

MIT License - xem LICENSE file để biết thêm details. 