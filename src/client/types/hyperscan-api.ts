export interface HyperScanTokenBalanceResponse {
  token: {
    address: string;
    circulating_market_cap: string | null;
    decimals: string;
    exchange_rate: string | null;
    holders: string;
    icon_url: string | null;
    name: string;
    symbol: string;
    total_supply: string;
    type: string;
    volume_24h: string | null;
  };
  token_id: string | null;
  token_instance: string | null;
  value: string;
}

export interface HyperScanNftNextPageParams {
  items_count: number;
  token_contract_address_hash: string;
  token_id: string;
  token_type: string;
}

export interface HyperScanNftCollectionsNextPageParams {
  token_contract_address_hash: string;
  token_type: string;
}

export interface HyperScanNftInstancesNextPageParams {
  holder_address_hash: string;
  unique_token: number;
}

export interface HyperScanNFTResponse {
  items: {
    animation_url: string | null;
    external_app_url: string | null;
    id: string;
    image_url: string;
    is_unique: boolean | null;
    media_type: string | null;
    media_url: string;
    metadata: {
      description?: string;
      image?: string;
      name?: string;
      title?: string;
      record?: {
        data: any;
        name: {
          expiry: string;
          name: string;
          owner: string;
        };
      };
      [key: string]: any; // Allow for additional metadata fields
    } | null;
    owner: string | null;
    thumbnails: any | null;
    token: {
      address_hash: string;
      circulating_market_cap: string | null;
      decimals: string | null;
      exchange_rate: string | null;
      holders_count: string;
      icon_url: string | null;
      name: string;
      symbol: string;
      total_supply: string | null;
      type: string;
      volume_24h: string | null;
    };
    token_type: string;
    value: string;
  }[];
  next_page_params: HyperScanNftNextPageParams | null;
}

export interface HyperScanNftCollectionsResponse {
  items: {
    amount: string;
    token: {
      address_hash: string;
      circulating_market_cap: string | null;
      decimals: string | null;
      exchange_rate: string | null;
      holders_count: string;
      icon_url: string | null;
      name: string;
      symbol: string;
      total_supply: string | null;
      type: string;
      volume_24h: string | null;
    };
    token_instances: {
      animation_url: string | null;
      external_app_url: string | null;
      id: string;
      image_url: string;
      is_unique: boolean | null;
      media_type: string | null;
      media_url: string;
      metadata: {
        description?: string;
        image?: string;
        name?: string;
        title?: string;
        record?: {
          data: any;
          name: {
            expiry: string;
            name: string;
            owner: string;
          };
        };
        [key: string]: any; // Allow for additional metadata fields
      } | null;
      owner: string | null;
      thumbnails: any | null;
      token: any | null;
      token_type: string;
      value: string;
    }[];
  }[];
  next_page_params: HyperScanNftCollectionsNextPageParams | null;
}

export interface HyperScanNftInstancesResponse {
  items: HyperScanNftInstancesItem[];
  next_page_params: HyperScanNftInstancesNextPageParams | null;
}

export interface HyperScanNftInstancesItem {
  animation_url: string | null;
  external_app_url: string | null;
  id: string;
  image_url: string;
  is_unique: boolean | null;
  media_type: string | null;
  media_url: string;
  metadata: {
    description?: string;
    image?: string;
    name?: string;
    title?: string;
    record?: {
      data: any;
      name: {
        expiry: string;
        name: string;
        owner: string;
      };
    };
    [key: string]: any; // Allow for additional metadata fields
  } | null;
  owner: string | null;
  thumbnails: any | null;
  token: {
    address_hash: string;
    circulating_market_cap: string | null;
    decimals: string | null;
    exchange_rate: string | null;
    holders_count: string;
    icon_url: string | null;
    name: string;
    symbol: string;
    total_supply: string | null;
    type: string;
    volume_24h: string | null;
  } | null;
  token_type: string;
  value: string;
}

export interface HyperScanTokenTransfersNextPageParams {
  block_number: number;
  index: number;
}

export interface HyperScanTokenTransfersItems {
  block_hash: string;
  block_number: number;
  from: {
    ens_domain_name: string | null;
    hash: string;
    implementations: any[];
    is_contract: boolean;
    is_scam: boolean;
    is_verified: boolean;
    metadata: any | null;
    name: string | null;
    private_tags: any[];
    proxy_type: string | null;
    public_tags: any[];
    watchlist_names: any[];
  };
  log_index: number;
  method: string;
  timestamp: string;
  to: {
    ens_domain_name: string | null;
    hash: string;
    implementations: any[];
    is_contract: boolean;
    is_scam: boolean;
    is_verified: boolean;
    metadata: any | null;
    name: string | null;
    private_tags: any[];
    proxy_type: string | null;
    public_tags: any[];
    watchlist_names: any[];
  };
  token: {
    address: string;
    address_hash: string;
    circulating_market_cap: string | null;
    decimals: string;
    exchange_rate: string | null;
    holders: string;
    holders_count: string;
    icon_url: string | null;
    name: string;
    symbol: string;
    total_supply: string;
    type: string;
    volume_24h: string | null;
  };
  total: {
    decimals: string;
    value: string;
  };
  transaction_hash: string;
  type: string;
}

export interface HyperScanTokenTransfersResponse {
  items: HyperScanTokenTransfersItems[];
  next_page_params: HyperScanTokenTransfersNextPageParams | null;
}

export interface HyperScanTransactionsResponse {
  items: HyperScanTransactionsItems;
  next_page_params: HyperScanTransactionsNextPageParams | null;
}

export interface HyperScanTransactionsItems {
  hash: string;
  fee: {
    type: string;
    value: string;
  };
  result: string | 'success';
  timestamp: string;
  from: {
    hash: string;
    is_contract: boolean;
  };
  to: {
    hash: string;
    is_contract: boolean;
  };
  transaction_types: ('coin_transfer' | 'token_transfer' | 'contract_call')[];
  value: string;
}
export interface HyperScanTransactionsNextPageParams {
  block_number: number;
  fee: string;
  hash: string;
  index: number;
  inserted_at: string;
  items_count: number;
  value: string;
}
