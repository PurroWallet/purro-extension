import { STORAGE_KEYS } from '@/background/constants/storage-keys';
import { ENDPOINTS } from './endpoints';

// Constants for easy customization
const HL_API_TIMEOUT = 5000; // 5 seconds timeout
const HL_PROFILE_CACHE_DURATION = 300000; // 5 minutes cache

export interface HLProfile {
  primaryName: string | null;
  avatar: string | null;
}

// Simple in-memory cache for profile data
const profileCache = new Map<string, { data: HLProfile; timestamp: number }>();

export const getHLNameByAddress = async (
  address: string
): Promise<string | null> => {
  const endpoint = `${ENDPOINTS.HL_NAME_API_BASE}/resolve/primary_name/${address}`;
  const response = await fetch(endpoint, {
    headers: { 'X-API-Key': STORAGE_KEYS.HL_NAME_API_KEY },
  });
  const data = await response.json();
  return data.primaryName;
};

export const getHLProfileByAddress = async (
  address: string
): Promise<HLProfile> => {
  // Check cache first
  const cached = profileCache.get(address);
  if (cached && Date.now() - cached.timestamp < HL_PROFILE_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const endpoint = `${ENDPOINTS.HL_NAME_API_BASE}/resolve/profile/${address}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HL_API_TIMEOUT);

    const response = await fetch(endpoint, {
      headers: { 'X-API-Key': STORAGE_KEYS.HL_NAME_API_KEY },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const profile: HLProfile = {
      primaryName: data.primaryName || null,
      avatar: data.avatar || null,
    };

    // Cache the result
    profileCache.set(address, { data: profile, timestamp: Date.now() });

    return profile;
  } catch (error) {
    console.warn('Failed to fetch HL profile:', error);
    // Return empty profile on error
    const emptyProfile: HLProfile = { primaryName: null, avatar: null };
    profileCache.set(address, { data: emptyProfile, timestamp: Date.now() });
    return emptyProfile;
  }
};

export const getAddressByDomain = async (
  domain: string
): Promise<string | null> => {
  const endpoint = `${ENDPOINTS.HL_NAME_API_BASE}/resolve/address/${domain}`;
  const response = await fetch(endpoint, {
    headers: { 'X-API-Key': STORAGE_KEYS.HL_NAME_API_KEY },
  });
  const data = await response.json();
  if (
    data.address === '0x0000000000000000000000000000000000000000' ||
    data.error
  ) {
    return null;
  }
  return data.address;
};
