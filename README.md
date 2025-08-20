# 🐱 Purro - The Purr-fect Web3 Wallet

> **Purro** is a native-first wallet crafted for the Hyperliquid and HyperEVM ecosystems. Built with practical UX, developer enablement, and deep protocol alignment in mind.

[![Version](https://img.shields.io/badge/version-0.6.8-blue.svg)](https://github.com/purro-xyz/purro-extension)
[![License](https://img.shields.io/badge/License-Non--Commercial-red.svg)](LICENSE)
[![Discord](https://img.shields.io/badge/discord-Join%20Community-blue.svg)](https://discord.gg/VJunuK9T5w)

## 🎯 Overview

Purro is a frictionless liquidity access layer for Hyperliquid + HyperEVM—not just a key manager. Built on Alchemy infrastructure and Hyper-native primitives (names, gasless flows), Purro prioritizes intent-driven UX and developer extensibility.

### 🌟 Key Highlights
- **Native Hyperliquid Integration**: Built specifically for Hyperliquid and HyperEVM ecosystems
- **Gasless Workflows**: Zero-fee transactions with native relayers (no HYPE needed)
- **Unified Portfolio**: Seamless view across Hyperliquid L1 and HyperEVM
- **Developer-First**: Standards-compliant provider and SDK modules
- **Multichain-Ready**: Designed to extend to Ethereum, Arbitrum, Base, Solana, and Sui

## ✨ Features

### 🔐 Secure Wallet Management
- **Create new wallet** with 12-word seed phrase
- **Import wallet** from seed phrase or private key
- **Watch-only accounts** for address monitoring
- **Data encryption** with password protection
- **Auto-lock** after inactivity period
- **Password change** and **seed phrase management**

### 🌐 Multi-Network Support
- **Hyperliquid EVM** (mainnet & testnet) - Primary network
- **Ethereum** mainnet
- **Arbitrum** One
- **Base** mainnet
- **Solana** (in development)
- **Sui** (in development)

### 🔄 Advanced Trading Features
- **In-App Swap Execution**: Complete token swapping on HyperEVM network
- **Advanced Token Search**: Comprehensive token discovery with infinite scroll
- **Real-Time Pricing**: Live price feeds from GeckoTerminal API
- **Gas Optimization**: Intelligent gas estimation with safety buffers
- **WRAP/UNWRAP Support**: Seamless HYPE ↔ WHYPE token conversion

### 🌐 dApp Integration & Discovery
- **DApp Explorer**: Curated directory with 11+ featured dApps
- **Watchlist System**: Star/unstar favorite dApps for quick access
- **EIP-1193** standard support with multi-provider discovery (EIP-6963)
- **EIP-712** typed data signing
- **Provider injection** for web pages

### 🏷️ Hyperliquid Names
- **Human-readable addresses**: Send and receive using Hyperliquid Names (e.g., `purro.hl`)
- **Name resolution** in transaction history
- **Native integration** with Hyperliquid ecosystem

### 💰 Fee Rebates
- **Default**: 40% swap fee rebates for all users in early phase
- **Boost**: 50% tier by invite/eligibility (partners, builders, high-volume)

### 🔒 Security & Testing
- **Comprehensive Security Test Suite**: 100+ security tests
- **Encryption Validation**: AES-256-GCM with PBKDF2 key derivation
- **Session Management**: Enhanced timeout and expiration handling
- **Memory Safety**: Secure cleanup and isolation

## 🏗️ Architecture

```
purro-extension/
├── src/
│   ├── background/          # Background scripts & service worker
│   │   ├── providers/       # Blockchain providers (EVM, Hyperliquid)
│   │   ├── handlers/        # Message handlers (accounts, storage, auth)
│   │   ├── lib/            # Core libraries (encryption, offscreen)
│   │   └── types/          # Type definitions
│   ├── client/             # React UI components
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens (main, swap, explorer, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # API services (Alchemy, Etherscan, etc.)
│   ├── assets/             # Static assets (icons, logos)
│   └── manifest.json       # Extension manifest (v3)
├── html/                   # HTML entry points
├── docs/                   # Documentation
└── public/                 # Public assets
```

### Core Components

#### 1. Background Script (`src/background/`)
- **Provider Manager**: Manages blockchain providers and connections
- **EVM Provider**: EIP-1193 implementation for EVM chains
- **Message Handler**: Handles communication between UI and background
- **Account Handler**: Manages accounts, keys, and encryption
- **Storage Handler**: Encrypted storage management

#### 2. UI Client (`src/client/`)
- **React 19.1.0** with TypeScript for type safety
- **Zustand** for state management with persistence
- **TanStack Query 5.80.7** for data fetching and caching
- **Tailwind CSS 4.1.8** for modern styling
- **Framer Motion** for smooth animations

#### 3. Provider System
- **EIP-1193** compliant Ethereum provider
- **EIP-6963** multi-provider discovery
- **Content script injection** into web pages
- **Event system** for dApp communication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- Chrome browser

### Installation

```bash
# Clone the repository
git clone https://github.com/purro-xyz/purro-extension.git
cd purro-extension

# Install dependencies
pnpm install

# Build the extension
pnpm run build
```

### Development

```bash
# Build and watch changes
pnpm run build:watch

# Type checking
pnpm run type-check

# Run tests
pnpm run test

# Run security tests
pnpm run test:security
```

### Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` folder

## 📱 Usage

### First-time Setup
1. **Install extension** from Chrome Web Store (coming soon)
2. **Create new wallet** or import existing wallet
3. **Create password** to protect wallet
4. **Backup seed phrase** securely

### Account Management
- **Create new account** for different chains
- **Import private key** or seed phrase
- **Switch accounts** easily
- **View balances** across multiple networks

### dApp Interaction
- **Connect wallet** with dApps via EIP-1193
- **Sign transactions** securely with EIP-712 support
- **Manage permissions** per-site
- **Switch networks** as requested by dApp

### Trading & Swaps
- **In-app token swapping** on HyperEVM
- **Real-time pricing** from GeckoTerminal
- **Gas optimization** with intelligent estimation
- **Transaction tracking** with confirmation dialogs

## 🔧 Developer Integration

### EVM Provider API

Purro provides complete EVM provider API:

```javascript
// Detect provider
const provider = window.ethereum; // or window.purro

// Connect wallet
const accounts = await provider.request({ 
  method: 'eth_requestAccounts' 
});

// Send transaction
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x...',
    value: '0x...'
  }]
});

// Sign message
const signature = await provider.request({
  method: 'personal_sign',
  params: ['Hello World!', accounts[0]]
});
```

### Supported RPC Methods
- `eth_requestAccounts` - Request account access
- `eth_accounts` - Get connected accounts
- `eth_chainId` - Get current chain ID
- `eth_sendTransaction` - Send transaction
- `personal_sign` - Sign message
- `eth_signTypedData_v4` - Sign typed data (EIP-712)
- `wallet_switchEthereumChain` - Switch chain
- `wallet_addEthereumChain` - Add new chain

### EIP-6963 Multi-Provider Discovery

```javascript
// Listen for provider announcements
window.addEventListener('eip6963:announceProvider', (event) => {
  const { detail } = event;
  console.log('Provider found:', detail.info.name);
  
  // Connect to Purro specifically
  if (detail.info.rdns === 'xyz.purro.app') {
    const provider = detail.provider;
    // Use provider...
  }
});
```

## 🧪 Testing

### Test Commands
```bash
# Run all tests
pnpm run test

# Run security tests
pnpm run test:security

# Run encryption tests
pnpm run test:encryption

# Run storage tests
pnpm run test:storage

# Full security audit
pnpm run security:check
```

### Provider Testing
Open `test-dapp-detection.html` in browser to test provider functionality.

## 🔒 Security

### Encryption & Storage
- **AES-256-GCM** encryption for sensitive data
- **PBKDF2** key derivation from password
- **Secure random** seed generation with `crypto.getRandomValues()`
- **Memory cleanup** for sensitive data

### Permission System
- **Origin validation** for all requests
- **User confirmation** for transactions
- **Per-site permissions** management
- **Session timeout** protection

### Security Features
- **Never store** private keys in plaintext
- **Always verify** transaction details
- **Comprehensive security tests** (100+ tests)
- **Regular security audits**

## 🌟 Roadmap

### Phase 1: Core Infrastructure (Completed ✅)
- ✅ **Multi-chain wallet functionality** - Ethereum, Arbitrum, Base, HyperEVM
- ✅ **dApp integration** - EIP-1193, EIP-6963, EIP-712 standards
- ✅ **Basic DeFi operations** - Send, receive, portfolio management
- ✅ **Security framework** - Encryption, authentication, session management
- ✅ **Provider system** - EVM provider with multi-wallet discovery
- ✅ **UI/UX foundation** - React 19, Tailwind CSS, responsive design

### Phase 2: Advanced Features (Completed ✅)
- ✅ **In-app swap functionality** - Complete HyperEVM token swapping
- ✅ **DApp explorer** - Curated directory with watchlist system
- ✅ **Advanced token management** - Search, discovery, real-time pricing
- ✅ **Enhanced security** - 100+ security tests, comprehensive audits
- ✅ **Performance optimizations** - Smart caching, incremental fetching
- ✅ **Notifications system** - Beta announcements and updates
- ✅ **Hyperliquid DEX integration** - Deposit, transfer, portfolio tracking

### Phase 3: Ecosystem Integration (In Progress 🔄)
- 🔄 **Solana integration** - Full Solana network support
- 🔄 **Sui integration** - Sui blockchain compatibility
- 🔄 **Enhanced DeFi integrations** - More protocols and dApps
- 🔄 **Advanced portfolio analytics** - Charts, P&L tracking, performance metrics
- 🔄 **Hardware wallet support** - Ledger, Trezor integration
- 🔄 **Mobile app development** - iOS and Android applications

### Phase 4: Advanced Features (Planned 📋)
- 📋 **Account abstraction (EIP-4337)** - Smart contract wallets
- 📋 **Gasless onboarding** - Zero-fee user registration
- 📋 **Advanced trading features** - Limit orders, DCA, portfolio rebalancing
- 📋 **Social features** - Transaction sharing, community features
- 📋 **Multi-language support** - Internationalization (i18n)
- 📋 **Advanced bridging** - One-click cross-chain transfers
- 📋 **Token launcher integration** - In-app token creation and deployment

### Phase 5: Ecosystem Growth (Future Vision 🚀)
- 🚀 **Referral & reward system** - Fee rebates and incentive programs
- 🚀 **Community plugin layer** - Developer mini-app/extension support
- 🚀 **Liquidity incentive tracker** - Farming, staking, yield optimization
- 🚀 **Advanced identity system** - NFT-based identity and reputation
- 🚀 **Cross-surface continuity** - Seamless experience across devices
- 🚀 **AI-powered features** - Smart recommendations and automation

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Create a Pull Request

### Development Standards
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Conventional commits** for commit messages
- **Comprehensive testing** for new features

### Bug Reports
- Use GitHub Issues
- Provide detailed steps to reproduce
- Include browser and extension version
- Attach console logs if available

## 📞 Support & Community

### Community Channels
- **Discord**: [Join our community](https://discord.gg/VJunuK9T5w)
- **Twitter**: [@purro_xyz](https://x.com/purro_xyz)
- **Telegram**: [https://t.me/purro_xyz](https://t.me/purro_xyz)

### Documentation
- **Official Docs**: [docs.purro.xyz](https://docs.purro.xyz)
- **API Documentation**: [docs/EVM_PROVIDER_README.md](docs/EVM_PROVIDER_README.md)
- **Architecture Guide**: [docs/evm-provider-architecture.md](docs/evm-provider-architecture.md)
- **Features Guide**: [docs/FEATURES_BUILDING.md](docs/FEATURES_BUILDING.md)

### Website
- **Homepage**: [https://purro.xyz](https://purro.xyz)
- **Install**: [https://purro.xyz/install](https://purro.xyz/install)

## 📄 License

This project is licensed under the **Purro Extension License** - a non-commercial license that allows educational use and contributions while protecting commercial rights.

**Key Terms:**
- ✅ **Educational & Research Use** - Free to use for learning and development
- ✅ **Contributions Welcome** - Pull requests, issues, and community discussions
- ❌ **Commercial Use Prohibited** - No commercial distribution or monetization
- 📧 **Commercial Licensing** - Contact: thaiphamngoctuong@gmail.com

**Effective Date:** January 1, 2025

See the [LICENSE](LICENSE) file for complete terms and conditions.

## 🐱 About Purro

**Purro** was created with the goal of making Hyperliquid and HyperEVM accessible and secure for everyone. We believe that DeFi and blockchain technology will change the future of finance, and Purro is the bridge that helps users easily participate in this new world.

Our mission is to provide:
- **Intent-aware UX**: Clear, contextual signing and gasless workflows
- **Ecosystem-native features**: Hyperliquid Names, one-click bridging, and reliable swaps
- **Builder-first approach**: Standards-compliant provider and SDK modules
- **Multichain-ready design**: Extensible to Ethereum, Arbitrum, Base, Solana, and Sui

---

💜 **Made with love by the Purro Team** 🐱

*Purro v0.6.8 - Enhanced Stability & Compatibility*
