// Re-export of the zustand network settings store so that it can be imported
// using the alias "@/store/network-settings-store" from anywhere in the codebase.
// The actual implementation lives under client/hooks to keep hooks colocated.

import useNetworkSettingsStore from "@/client/hooks/use-network-store";

export * from "@/client/hooks/use-network-store";
export default useNetworkSettingsStore; 