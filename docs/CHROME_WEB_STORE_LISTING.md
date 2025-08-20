### Title
Purro Wallet — Hyperliquid‑Native Web3 Wallet (Beta)

### Short description (≤132 chars)
Non‑custodial Hyperliquid wallet. HyperEVM, swaps, portfolio, NFTs, HL Names. Gas‑optimized swaps (gasless coming soon).

### Full description
Purro is a Hyperliquid‑native Chrome extension wallet designed for speed, security, and a clean UX. It supports HyperEVM alongside Ethereum, Arbitrum, and Base, with a unified portfolio, in‑app swaps, NFT viewing, and .hl identity.

- **Multi‑chain**: HyperEVM (chainId 999, 0x3e7), Ethereum, Arbitrum, Base
- **Swaps**: In‑app LiquidSwap integration, route finding, WRAP/UNWRAP HYPE ↔ WHYPE, slippage control, DEX exclusion
- **Gas‑optimized**: EIP‑1559 fee support with safety buffers and L1/L2‑aware pricing
- **Identity**: Hyperliquid Names (.hl) address resolution across the wallet
- **NFTs**: Collection & instance viewing with IPFS support
- **Performance**: Optimized caching, debounced requests, sub‑second UI
- **Security**: Non‑custodial, AES‑256 encryption, password protection, auto‑lock, offscreen cryptography

What Purro does NOT do:
- **Gasless swaps** are not yet available. We currently provide gas‑optimized swaps. Gasless is planned and will be released later.

### Key features
- **Hyperliquid‑native architecture** with HyperEVM compatibility (chainId `0x3e7` / 999)
- **EVM Provider** following EIP‑1193/6963, dApp injection at `document_start`
- **Advanced gas estimation**: EIP‑1559 (`maxFeePerGas`, `maxPriorityFeePerGas`) and buffered gas limits
- **In‑app swaps** with LiquidSwap routing, multi‑hop, slippage, and WRAP/UNWRAP support
- **Unified portfolio** across supported chains with live balances and token metadata
- **.hl Names integration** for readable addresses and profile linking
- **NFT viewer** with IPFS handling
- **Auto‑lock** and secure session management

### Permissions (from manifest)
- **storage**: Save wallet settings, cache token metadata, and user preferences locally
- **tabs**: Detect and connect to dApps to provide the injected EVM provider
- **sidePanel**: Optional side panel experience for quick access
- **alarms**: Schedule secure auto‑lock timers and background refreshes
- **offscreen**: Perform cryptographic operations in an isolated offscreen document

No private keys or sensitive data leave your device. Purro is non‑custodial and performs encryption client‑side.

### Supported networks
- **HyperEVM** (Hyperliquid L2) — chainId 999 (`0x3e7`)
- **Ethereum Mainnet** — chainId 1 (`0x1`)
- **Arbitrum One** — chainId 42161 (`0xa4b1`)
- **Base** — chainId 8453 (`0x2105`)

### What’s new (v0.6.5)
- Performance and stability improvements
- Enhanced swap experience and token metadata handling
- UI/UX polish across portfolio and NFT views

### How to use
1) Install the extension and open Purro from the toolbar
2) Create a new wallet or import via seed/private key
3) Pick your active network (HyperEVM, Ethereum, Arbitrum, Base)
4) View your portfolio, swap tokens, and explore NFTs
5) Connect to dApps; Purro injects an EIP‑1193 provider at page load

### Data safety
- **Non‑custodial**: Keys are generated and stored locally
- **No selling of data**: We do not sell or share your personal data
- **Minimal telemetry**: No unnecessary tracking; network calls are for on‑chain or wallet features only

### Support
- **Website**: https://purro.xyz/
- **Docs**: https://docs.purro.xyz/
- **Install guide**: https://purro.xyz/install/
- **X (Twitter)**: https://x.com/purroxyz

### Screenshots (captions guidance)
- Main dashboard — Multi‑chain portfolio
- Swap — LiquidSwap routing and slippage control
- NFTs — IPFS image support
- Settings — Auto‑lock and security
- Connect — dApp permission prompt

### Disclaimer
Purro is in Beta. Always verify transaction details before confirming. Crypto assets are volatile; use at your own risk. 