# 🚀 Purro Extension v0.6.9 – ChainChanged Handling & Unsupported Network UX

## 🎉 Highlights
- **Stable EIP-1193 `chainChanged` flow**: consistent chainId sync and event emission
- **New Unsupported Chain popup**: right-aligned like Connect; single Close button so dApps stop loading (error 4902)

## ✨ What's New
- **Unsupported Chain Popup**
  - New page `html/unsupported-chain.html` mounting React `UnsupportedChainScreen`
  - Right-side positioning reuses Connect’s `calculatePopupPosition(sender)`
  - Shows active account (via `useInit`) and renders supported networks list with logos
  - Chain list logic matches `supported-chains-dropdown.tsx` (filters by dev mode and active networks; HyperEVM prioritized)
  - Single Close button; auto-closes after 30s

- **EIP-1193 `chainChanged`**
  - Provider throws `ProviderError(4902, ...)` immediately when background reports unsupported chain so dApps end spinners
  - Background opens Unsupported popup and returns 4902 on unsupported `wallet_switchEthereumChain`
  - ProviderManager and content script relay and emit `CHAIN_CHANGED` events to dApps reliably

## 🔧 Technical Changes
- Background
  - `handleSwitchEthereumChain(data, sender)`: validate support; open `unsupported-chain.html?chainId=...`; return `code: 4902`
  - Reuse `calculatePopupPosition(sender)` for right-aligned popup
  - Added handlers for `CHAIN_CHANGED` and `SWITCH_TO_SUPPORTED_CHAIN` (used by popup if needed)

- Provider
  - `handleSwitchEthereumChain`: if unsupported, throw 4902 so dApps stop loading immediately
  - Improved `chainId` sync and `chainChanged` emission; send `CHAIN_CHANGED` to background when appropriate

- Content Script & ProviderManager
  - Relay `CHAIN_CHANGED` from background to injected provider; emit `chainChanged`

- Build & Manifest
  - Vite input includes `html/unsupported-chain.html`
  - `manifest.json` web_accessible_resources includes `html/unsupported-chain.html`

## 🧪 How to Test
1. Load `dist` in Chrome (Developer mode → Load unpacked)
2. From a dApp, call `wallet_switchEthereumChain` to an unsupported chain (e.g., `0xa`)
   - Expected: dApp receives `4902` instantly (no spinner), and Unsupported popup opens right-aligned showing account + supported networks and a Close button

## 📦 Build
```bash
pnpm install
pnpm run build
```
Load `dist` via `chrome://extensions` → Developer mode → Load unpacked.

## 🔄 Upgrade Notes (from v0.6.8)
- Backward compatible; no data migrations required

## 🌐 Networks (unchanged)
- Hyperliquid EVM (mainnet & testnet)
- Ethereum Mainnet
- Arbitrum One
- Base Mainnet 