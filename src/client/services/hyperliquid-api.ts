import { SpotTokenDetails } from '@/client/types/hyperliquid-api';
import { ENDPOINTS } from './endpoints';

export const fetchSpotAssetsContext = async () => {
    const response = await fetch(`${ENDPOINTS.HYPERLIQUID_L1}/info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'spotMetaAndAssetCtxs',
        }),
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};

export const fetchUserSpotBalance = async (address: string) => {
    const response = await fetch(`${ENDPOINTS.HYPERLIQUID_L1}/info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'spotClearinghouseState',
            user: address,
        }),
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};

export const fetchUserPerpsBalance = async (address: string) => {
    const response = await fetch(`${ENDPOINTS.HYPERLIQUID_L1}/info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'clearinghouseState',
            user: address,
            dex: '',
        }),
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};

export const fetchSpotTokenDetails = async (tokenId: string): Promise<SpotTokenDetails> => {
    const response = await fetch(`${ENDPOINTS.HYPERLIQUID_L1}/info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'tokenDetails',
            tokenId,
        }),
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
};






