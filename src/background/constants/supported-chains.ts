import {
  arbitrumLogo,
  baseLogo,
  ethereumLogo,
  hyperliquidLogo,
} from '@/assets/logo';
import { ChainInfo } from '../types/evm-provider';

export const supportedEVMChains: { [key: string]: ChainInfo } = {
  '0x1': {
    chainId: '0x1',
    chainIdNumber: 1,
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://ethereum.publicnode.com', 'https://rpc.ankr.com/eth'],
    blockExplorerUrls: ['https://etherscan.io'],
    isTestnet: false,
    logo: ethereumLogo,
  },
  '0xa4b1': {
    chainId: '0xa4b1',
    chainIdNumber: 42161,
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
    ],
    blockExplorerUrls: ['https://arbiscan.io'],
    isTestnet: false,
    logo: arbitrumLogo,
  },
  '0x2105': {
    chainId: '0x2105',
    chainIdNumber: 8453,
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org', 'https://base.publicnode.com'],
    blockExplorerUrls: ['https://basescan.org'],
    isTestnet: false,
    logo: baseLogo,
  },
  '0x3e7': {
    chainId: '0x3e7',
    chainIdNumber: 999,
    chainName: 'HyperEVM',
    nativeCurrency: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 },
    rpcUrls: ['https://rpc.hyperliquid.xyz/evm'],
    blockExplorerUrls: ['https://purrsec.com'],
    isTestnet: false,
    logo: hyperliquidLogo,
  },
  // "0x3e6": {
  //     chainId: '0x3e6',
  //     chainIdNumber: 998,
  //     chainName: 'HyperEVM Testnet',
  //     nativeCurrency: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 },
  //     rpcUrls: ['https://rpc.hyperliquid-testnet.xyz/evm'],
  //     blockExplorerUrls: ['https://testnet.purrsec.com'],
  //     isTestnet: true,
  //     logo: hyperliquidLogo
  // }
};
