import { SpotTokenDetails } from '@/client/types/hyperliquid-api';
import { ENDPOINTS } from './endpoints';

// Constants for easy customization
const ADDRESS_VALIDATION_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Helper function to validate address
const isValidAddress = (address: string): boolean => {
    return !!address && ADDRESS_VALIDATION_REGEX.test(address);
};

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
    if (!isValidAddress(address)) {
        throw new Error(`Invalid address format: ${address}`);
    }

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
    if (!isValidAddress(address)) {
        throw new Error(`Invalid address format: ${address}`);
    }

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
    if (!tokenId || tokenId.trim() === '') {
        throw new Error('Token ID is required');
    }

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






