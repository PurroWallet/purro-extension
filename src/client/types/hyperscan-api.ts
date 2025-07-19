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
    items_count: number,
    token_contract_address_hash: string,
    token_id: string,
    token_type: string
}

export interface HyperScanNftCollectionsNextPageParams {
    token_contract_address_hash: string,
    token_type: string
}

export interface HyperScanNftInstancesNextPageParams {
    holder_address_hash: string;
    unique_token: number;
}

export interface HyperScanNFTResponse {
    items: {
        is_unique: boolean;
        id: string;
        holder_address_hash: string;
        image_url: string;
        animation_url: string;
        external_app_url: string;
        metadata: {
            year: number;
            tags: string[];
            name: string;
            image_url: string;
            home_url: string;
            external_url: string;
            description: string;
            attributes: Array<{
                value: string;
                trait_type: string;
            }>;
        };
        token: {
            circulating_market_cap: string;
            icon_url: string;
            name: string;
            decimals: string;
            symbol: string;
            address: string;
            type: string;
            holders: string;
            exchange_rate: string;
            total_supply: string;
        };
        token_type: string;
        value: string;
    }[],
    next_page_params: HyperScanNftNextPageParams
}

export interface HyperScanNftCollectionsResponse {
    items: {
        token: {
            circulating_market_cap: string;
            icon_url: string;
            name: string;
            decimals: string;
            symbol: string;
            address: string;
            type: string;
            holders: string;
            exchange_rate: string;
            total_supply: string;
        },
        amount: string,
        token_instances: {
            is_unique: boolean,
            id: string,
            holder_address_hash: string,
            image_url: string,
            animation_url: string,
            external_app_url: string,
            metadata: {
                year: number,
                tags: string[],
                name: string,
                image_url: string,
                home_url: string,
                external_url: string,
                description: string,
                attributes: Array<{
                    value: string;
                    trait_type: string;
                }>
            }
        }[]
    }[]
    next_page_params: HyperScanNftCollectionsNextPageParams
}

export interface HyperScanNftInstancesResponse {
    items: HyperScanNftInstancesItem[];
    next_page_params: HyperScanNftInstancesNextPageParams | null;
}

export interface HyperScanNftInstancesItem {
    is_unique: boolean;
    id: string;
    holder_address_hash: string;
    image_url: string;
    animation_url: string;
    external_app_url: string;
    metadata: {
        year: number;
        tags: string[];
        name: string;
        image_url: string;
        home_url: string;
        external_url: string;
        description: string;
        attributes: Array<{
            value: string;
            trait_type: string;
        }>;
    };
    token: {
        circulating_market_cap: string;
        icon_url: string;
        name: string;
        decimals: string;
        symbol: string;
        address: string;
        type: string;
        holders: string;
        exchange_rate: string;
        total_supply: string;
    };
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
    result: string | "success";
    timestamp: string;
    from: {
        hash: string;
        is_contract: boolean;
    }
    to: {
        hash: string;
        is_contract: boolean;
    }
    transaction_types: ("coin_transfer" | "token_transfer" | "contract_call")[]
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
