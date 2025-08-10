# 🚀 Purro Extension v0.3.1 - Beta Release

## 🎉 Highlights
- New optimized Home with tabs for EVM, Spot, and Perps
- NFT viewing with instance dialogs and IPFS support
- Hyperliquid DEX deposit/transfer flows in-app
- Side Panel support and faster UI (React 19, Vite 6, Tailwind CSS 4)
- Robust EIP-6963 multi-provider discovery and EIP-1193 event handling
- Token metadata caching, unified token lists, and testnet token management
- Expanded Settings: developer mode, auto-lock time, connected dApps, cache controls

## ✨ What’s New

### UI/UX
- Optimized Home with tabbed views: `EVM`, `Spot`, `Perps` for clearer navigation.
- New drawers: Send, Swap, Bridge, and Hyperliquid Deposit.
- Side Panel experience enhanced for quick access to wallet in compatible pages.
- Smoother animations and overall performance improvements.

### Assets & NFTs
- NFT screens with instance dialogs and ID drill-down.
- IPFS image handling for NFT/media assets.

### Hyperliquid DEX
- In-app deposit and transfer flows for Hyperliquid DEX with clear confirmations and success states.
- Portfolio hooks and indexers for better HL asset visibility.

### Tokens & Portfolio
- Unified token lists across networks with caching.
- Token metadata cache and invalidation controls.
- Testnet token management and simple wallet address displays.

### Provider & dApp Integration
- EIP-6963: Improved multi-provider discovery and provider announcements.
- EIP-1193: Solid `request()` flow with connect/disconnect, `accountsChanged`, and `chainChanged` events.
- EIP-712 typed data signing and legacy methods compatibility remain supported.

### Settings & Security
- Auto-lock time configuration and session duration handling.
- Developer Mode toggle for advanced diagnostics.
- Connected dApps management and per-site permissions.
- Origin validation, user confirmations for sensitive actions, and session protection.

## 🔧 Improvements
- Updated toolchain: React 19, Vite 6, Tailwind CSS 4, TanStack Query 5.
- Faster data fetching and caching via React Query.
- Ethers v6 guidance and gas estimation notes (see docs/ETHERS_V6_GAS_ESTIMATED_GUIDE.md).
- Offscreen document usage for reliable background/communication tasks.
- Better error handling and more consistent RPC responses.

## 🐞 Fixes
- Reliability fixes for provider injection and dApp detection (see docs/CONNECTION_FIXES.md).
- Stability improvements for storage, account management, and encryption flows.
- UI edge cases in dialogs/drawers addressed.

## 🧪 Testing
- Encryption, Storage, and Account handler tests available:
  - `pnpm run test:encryption`
  - `pnpm run test:storage`
  - `pnpm run test:account`
  - `pnpm run test:handlers`

## 📦 Build & Install
```bash
pnpm install
pnpm run build         # Production build
pnpm run build:watch   # Dev watch
pnpm run type-check
```
Load the `dist` folder in Chrome via `chrome://extensions` → Developer mode → Load unpacked.

## 🔄 Upgrade Notes (from v0.2.5)
- Prefer EIP-6963 discovery (`rdns: com.purro.wallet`) for provider selection.
- Some UI flows were reorganized into drawers/tabs; no action needed for dApps.
- Token data now uses caching; you can clear caches in Settings → Token Cache Management.

## 🌐 Networks
- Hyperliquid EVM (mainnet & testnet)
- Ethereum Mainnet, Arbitrum One, Base Mainnet
- Solana & Sui scaffolding present (in development)

## 📚 References
- Provider API: docs/EVM_PROVIDER_README.md
- Architecture: docs/evm-provider-architecture.md
- Communication: docs/evm-provider-communication.md

## 📝 Notes
- A packaged build is available for distribution (see v0.3.1.zip).

---

💜 Made with love by the Purro Team 🐱

*Purro v0.3.1 - The Purr-fect Web3 Wallet* 