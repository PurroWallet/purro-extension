const HL_NAME_API_BASE = "https://api.hlnames.xyz";

export const HL_NAME_API_ENDPOINTS = {
  RESOLVE_NAME: (address: string) =>
    `${HL_NAME_API_BASE}/resolve/primary_name/${address}`,
  RESOLVE_ADDRESS: (domain: string) =>
    `${HL_NAME_API_BASE}/resolve/address/${domain}`,
};
