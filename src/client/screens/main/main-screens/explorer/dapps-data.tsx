import {
  hyperliquidLogo,
  deBridgeLogo,
  hyperUnit,
  liquidSwapLogo,
  hyperSwapLogo,
  stakedHypeLogo,
  liquidLaunchLogo,
  hpumpLogo,
  hyperlendLogo,
  hyperevmscanLogo,
  driptradeLogo,
  hlNameLogo,
} from '@/assets/logo';

export interface DApp {
  id: string;
  name: string;
  category: string;
  url: string;
  logo: string;
}

// Simple DApps data
export const DAPPS_DATA: DApp[] = [
  {
    id: 'hyperliquid-dex',
    name: 'Hyperliquid',
    category: 'DeFi',
    url: 'https://app.hyperliquid.xyz/trade',
    logo: hyperliquidLogo,
  },
  {
    id: 'hyperunit',
    name: 'HyperUnit',
    category: 'Bridge',
    url: 'https://app.hyperunit.xyz',
    logo: hyperUnit,
  },
  {
    id: 'liquidswap',
    name: 'LiquidSwap',
    category: 'Aggregator',
    url: 'https://liqd.ag',
    logo: liquidSwapLogo,
  },
  {
    id: 'hyperswap',
    name: 'HyperSwap',
    category: 'DEX',
    url: 'https://app.hyperswap.exchange',
    logo: hyperSwapLogo,
  },
  {
    id: 'hyperliquid-names',
    name: 'Hyperliquid Names',
    category: 'Infrastructure',
    url: 'https://app.hlnames.xyz',
    logo: hlNameLogo,
  },
  {
    id: 'liquidlaunch',
    name: 'LiquidLaunch',
    category: 'Launchpad',
    url: 'https://liquidlaunch.app/',
    logo: liquidLaunchLogo,
  },
  {
    id: 'hyperlend',
    name: 'HyperLend',
    category: 'Lending',
    url: 'https://hyperlend.finance/',
    logo: hyperlendLogo,
  },
  {
    id: 'hpump',
    name: 'HPump',
    category: 'Memecoins',
    url: 'https://hpump.trade/',
    logo: hpumpLogo,
  },
  {
    id: 'hyperevmscan',
    name: 'HyperEVM Scan',
    category: 'Explorer',
    url: 'https://hyperevmscan.io/',
    logo: hyperevmscanLogo,
  },
  {
    id: 'drip-trade',
    name: 'Drip.Trade',
    category: 'NFT',
    url: 'https://drip.trade/',
    logo: driptradeLogo,
  },

  {
    id: 'stakedhype',
    name: 'StakedHype',
    category: 'Staking',
    url: 'https://www.stakedhype.fi/',
    logo: stakedHypeLogo,
  },
  {
    id: 'debridge',
    name: 'DeBridge',
    category: 'Bridge',
    url: 'https://app.debridge.finance/?inputChain=8453&outputChain=999',
    logo: deBridgeLogo,
  },
];
