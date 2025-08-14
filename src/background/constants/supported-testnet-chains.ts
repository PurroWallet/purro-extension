import { hyperliquidLogo } from '@/assets/logo';
import { ChainInfo } from '../types/evm-provider';

export const supportedTestnetChains: { [key: string]: ChainInfo } = {
  '0x3e6': {
    chainId: '0x3e6',
    chainIdNumber: 998,
    chainName: 'HyperEVM Testnet',
    nativeCurrency: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 },
    rpcUrls: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    blockExplorerUrls: ['https://testnet.purrsec.com'],
    isTestnet: true,
    logo: hyperliquidLogo,
  },
};
