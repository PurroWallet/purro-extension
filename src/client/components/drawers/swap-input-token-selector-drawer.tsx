import React, { useState, useMemo, useEffect } from "react";
import { X, Search, RefreshCw } from "lucide-react";
import { UnifiedToken } from "@/client/components/token-list";
import { getTokenLogo } from "@/client/utils/icons";
import useSwapStore from "@/client/hooks/use-swap-store";
import useDrawerStore from "@/client/hooks/use-drawer-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { fetchBalances } from "@/client/services/liquidswap-api";

// Simple formatBalance function
const formatBalance = (balance: number): string => {
  if (balance === 0) return "0";
  if (balance < 0.000001) return "<0.000001";
  if (balance < 1) return balance.toFixed(6);
  if (balance < 1000) return balance.toFixed(4);
  if (balance < 1000000) return (balance / 1000).toFixed(2) + "K";
  return (balance / 1000000).toFixed(2) + "M";
};

interface InputToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // Balance in token units (not wei)
  balanceRaw: string; // Raw balance from API
  logo?: string | null;
}

interface SwapInputTokenSelectorDrawerProps {
  selectedTokenAddress?: string; // To exclude from list
}

const SwapInputTokenSelectorDrawer: React.FC<
  SwapInputTokenSelectorDrawerProps
> = ({ selectedTokenAddress }) => {
  const { setTokenIn } = useSwapStore();
  const { closeDrawer } = useDrawerStore();
  const { getActiveAccountWalletObject } = useWalletStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<InputToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Fetch user balances which includes all token data
  useEffect(() => {
    const loadBalances = async () => {
      if (!activeAccountAddress) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);

        const response = await fetchBalances({
          wallet: activeAccountAddress,
          limit: 200,
        });

        console.log("Input tokens - fetchBalances response:", response);

        if (response.success) {
          // Convert Balance objects to InputToken format
          const inputTokens: InputToken[] = response.data.tokens
            .filter((balance) => balance.token !== selectedTokenAddress) // Exclude selected token
            .map((balance) => {
              const balanceNum =
                parseFloat(balance.balance) / Math.pow(10, balance.decimals);

              const tokenAddress = balance.token.toLowerCase().includes("native")
                ? "0x5555555555555555555555555555555555555555"
                : balance.token;
              return {
                address: tokenAddress,
                symbol: balance.symbol,
                name: balance.name,
                decimals: balance.decimals,
                balance: balanceNum.toString(),
                balanceRaw: balance.balance,
                logo: getTokenLogo(balance.symbol),
              };
            });

          setTokens(inputTokens);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error("Error fetching input token balances:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadBalances();
  }, [activeAccountAddress, selectedTokenAddress]);

  // Filter tokens based on search and sort by balance
  const filteredTokens = useMemo(() => {
    let filtered = tokens;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query)
      );
    }

    // Sort by balance (highest first), then by symbol
    return filtered.sort((a, b) => {
      const balanceA = parseFloat(a.balance) || 0;
      const balanceB = parseFloat(b.balance) || 0;

      if (balanceA !== balanceB) {
        return balanceB - balanceA; // Higher balance first
      }

      return a.symbol.localeCompare(b.symbol); // Alphabetical fallback
    });
  }, [tokens, searchQuery]);

  const handleTokenSelect = (token: InputToken) => {
    console.log("🔍 Selected token:", token);

    // Convert InputToken to UnifiedToken format
    const unifiedToken: UnifiedToken = {
      contractAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      balance: token.balanceRaw, // Use raw balance for compatibility
      chain: "hyperevm",
      chainName: "HyperEVM",
      logo: token.logo || undefined,
      balanceFormatted: parseFloat(token.balance) || 0,
      usdValue: 0, // Will be calculated elsewhere if needed
    };

    setTokenIn(unifiedToken);
    closeDrawer();
  };

  const getTokenBalance = (token: InputToken): string => {
    const balance = parseFloat(token.balance) || 0;
    return formatBalance(balance);
  };

  const refreshBalances = async () => {
    if (!activeAccountAddress) return;

    setIsLoading(true);
    try {
      const response = await fetchBalances({
        wallet: activeAccountAddress,
        limit: 200,
      });

      if (response.success) {
        // Convert Balance objects to InputToken format
        const inputTokens: InputToken[] = response.data.tokens
          .filter((balance) => balance.token !== selectedTokenAddress)
          .map((balance) => {
            const balanceNum =
              parseFloat(balance.balance) / Math.pow(10, balance.decimals);
            return {
              address: balance.token,
              symbol: balance.symbol,
              name: balance.name,
              decimals: balance.decimals,
              balance: balanceNum.toString(),
              balanceRaw: balance.balance,
              logo: getTokenLogo(balance.symbol),
            };
          });

        setTokens(inputTokens);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Error refreshing input token balances:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Select Input Token</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshBalances}
            disabled={isLoading}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh balances"
          >
            <RefreshCw
              className={`size-4 text-gray-400 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
          <button
            onClick={closeDrawer}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="size-4 text-white" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search your tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
            <span className="text-gray-400">Loading your tokens...</span>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <span className="text-red-400 text-center mb-3">
              Error loading your tokens
            </span>
            <button
              onClick={refreshBalances}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-gray-400">
              {searchQuery
                ? "No matching tokens found"
                : "You don't have any tokens yet"}
            </span>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {filteredTokens.map((token) => {
              const tokenLogo = token.logo || getTokenLogo(token.symbol);
              const balance = getTokenBalance(token);
              const hasBalance = parseFloat(token.balance) > 0;

              return (
                <button
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full flex items-center p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  {/* Token Icon */}
                  <div className="size-10 flex items-center justify-center bg-gray-800 rounded-full mr-3 overflow-hidden">
                    {tokenLogo ? (
                      <img
                        src={tokenLogo}
                        alt={token.symbol}
                        className="size-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-400">
                        {token.symbol.slice(0, 3)}
                      </span>
                    )}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                          {token.symbol}
                        </p>
                        {token.name && (
                          <p className="text-sm text-gray-400 truncate max-w-40">
                            {token.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            hasBalance ? "text-white" : "text-gray-500"
                          }`}
                        >
                          {balance}
                        </p>
                        <p className="text-xs text-gray-400">Balance</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapInputTokenSelectorDrawer;
