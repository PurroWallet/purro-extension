import { STORAGE_KEYS } from "@/background/constants/storage-keys";
import { ENDPOINTS } from "./endpoints";

export const getHLNameByAddress = async (
  address: string
): Promise<string | null> => {
  const endpoint = `${ENDPOINTS.HL_NAME_API_BASE}/resolve/primary_name/${address}`;
  const response = await fetch(endpoint, {
    headers: { "X-API-Key": STORAGE_KEYS.HL_NAME_API_KEY },
  });
  const data = await response.json();
  return data.primaryName;
};

export const getHLNameByDomain = async (
  domain: string
): Promise<string | null> => {
  const endpoint = `${ENDPOINTS.HL_NAME_API_BASE}/resolve/address/${domain}`;
  const response = await fetch(endpoint, {
    headers: { "X-API-Key": STORAGE_KEYS.HL_NAME_API_KEY },
  });
  const data = await response.json();
  return data.address;
};
