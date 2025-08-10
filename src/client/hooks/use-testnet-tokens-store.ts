import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TestnetToken {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    balanceFormatted: number;
    usdValue?: number;
    usdPrice?: number;
    icon_url?: string;
    isNative?: boolean;
}

interface TestnetTokensStore {
    tokens: TestnetToken[];

    // Actions
    addToken: (token: Omit<TestnetToken, 'balance' | 'balanceFormatted' | 'usdValue'>) => void;
    updateTokenBalance: (address: string, balance: string, balanceFormatted: number, usdValue?: number, usdPrice?: number) => void;
    removeToken: (address: string) => void;
    clearTokens: () => void;

    // Getters
    getTokenByAddress: (address: string) => TestnetToken | undefined;
    getTotalValue: () => number;
    getTokenCount: () => number;
}

const useTestnetTokensStore = create<TestnetTokensStore>()(
    persist(
        (set, get) => ({
            tokens: [
                // Default HYPE native token
                {
                    address: '0x0000000000000000000000000000000000000000',
                    name: 'Hyperliquid',
                    symbol: 'HYPE',
                    decimals: 18,
                    balance: '0',
                    balanceFormatted: 0,
                    usdValue: 0,
                    usdPrice: 0,
                    isNative: true,
                }
            ],

            addToken: (tokenData) => {
                set((state) => {
                    const existingToken = state.tokens.find(t => t.address.toLowerCase() === tokenData.address.toLowerCase());
                    if (existingToken) {
                        return state; // Token already exists
                    }

                    const newToken: TestnetToken = {
                        ...tokenData,
                        balance: '0',
                        balanceFormatted: 0,
                        usdValue: 0,
                    };

                    return {
                        tokens: [...state.tokens, newToken]
                    };
                });
            },

            updateTokenBalance: (address, balance, balanceFormatted, usdValue, usdPrice) => {
                set((state) => ({
                    tokens: state.tokens.map(token =>
                        token.address.toLowerCase() === address.toLowerCase()
                            ? {
                                ...token,
                                balance,
                                balanceFormatted,
                                usdValue: usdValue || 0,
                                usdPrice: usdPrice || token.usdPrice
                            }
                            : token
                    )
                }));
            },

            removeToken: (address) => {
                set((state) => ({
                    tokens: state.tokens.filter(token =>
                        token.address.toLowerCase() !== address.toLowerCase()
                    )
                }));
            },

            clearTokens: () => {
                set({
                    tokens: [
                        // Keep default HYPE native token
                        {
                            address: '0x0000000000000000000000000000000000000000',
                            name: 'Hyperliquid',
                            symbol: 'HYPE',
                            decimals: 18,
                            balance: '0',
                            balanceFormatted: 0,
                            usdValue: 0,
                            usdPrice: 0,
                            isNative: true,
                        }
                    ]
                });
            },

            getTokenByAddress: (address) => {
                return get().tokens.find(token =>
                    token.address.toLowerCase() === address.toLowerCase()
                );
            },

            getTotalValue: () => {
                return get().tokens.reduce((total, token) => total + (token.usdValue || 0), 0);
            },

            getTokenCount: () => {
                return get().tokens.length;
            }
        }),
        {
            name: "testnet-tokens-storage",
            version: 1,
        }
    )
);

export default useTestnetTokensStore; 