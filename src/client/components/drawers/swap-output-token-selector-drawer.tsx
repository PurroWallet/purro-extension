import React, { useState, useMemo, useEffect } from "react";
import { X, Search, RefreshCw } from "lucide-react";
import { UnifiedToken } from "@/client/components/token-list";
import { getTokenLogo } from "@/client/utils/icons";
import useSwapStore from "@/client/hooks/use-swap-store";
import useDrawerStore from "@/client/hooks/use-drawer-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { fetchTokens, fetchBalances } from "@/client/services/liquidswap-api";
import { FetchTokenResponse, Balance } from "@/client/types/liquiswap-api";

// Simple formatBalance function
const formatBalance = (balance: number): string => {
  if (balance === 0) return "0";
  if (balance < 0.000001) return "<0.000001";
  if (balance < 1) return balance.toFixed(6);
  if (balance < 1000) return balance.toFixed(4);
  if (balance < 1000000) return (balance / 1000).toFixed(2) + "K";
  return (balance / 1000000).toFixed(2) + "M";
};

interface OutputToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // Balance in token units (not wei)
  balanceRaw: string; // Raw balance from API  
  logo?: string | null;
  transfers24h?: number;
}

interface SwapOutputTokenSelectorDrawerProps {
  selectedTokenAddress?: string; // To exclude from list
}

const SwapOutputTokenSelectorDrawer: React.FC<SwapOutputTokenSelectorDrawerProps> = ({
  selectedTokenAddress,
}) => {
  const { setTokenOut } = useSwapStore();
  const { closeDrawer } = useDrawerStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<OutputToken[]>([]);
  const [userBalances, setUserBalances] = useState<Balance[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Fetch all available tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setIsLoadingTokens(true);
        setHasError(false);
        
        const response: FetchTokenResponse = await fetchTokens({
          limit: 200,
          metadata: true
        });

        console.log("Output tokens - fetchTokens response:", response);
        
        if (response.success) {
          const outputTokens: OutputToken[] = response.data.tokens
            .filter(token => token.address !== selectedTokenAddress)
            .map(token => ({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              balance: "0", // Will be updated with actual balance if user has any
              balanceRaw: "0",
              logo: getTokenLogo(token.symbol),
              transfers24h: token.transfers24h
            }));
          
          setTokens(outputTokens);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error("Error fetching output tokens:", error);
        setHasError(true);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    loadTokens();
  }, [selectedTokenAddress]);

  // Fetch user balances to show which tokens user owns
  useEffect(() => {
    const loadBalances = async () => {
      if (!activeAccountAddress) {
        setIsLoadingBalances(false);
        return;
      }

      try {
        setIsLoadingBalances(true);
        
        const response = await fetchBalances({
          wallet: activeAccountAddress,
          limit: 200
        });
        
        if (response.success) {
          setUserBalances(response.data.tokens);
        }
      } catch (error) {
        console.error("Error fetching user balances for output tokens:", error);
        // Don't set error for balances since it's optional
      } finally {
        setIsLoadingBalances(false);
      }
    };

    loadBalances();
  }, [activeAccountAddress]);

  // Merge tokens with user balances
  const tokensWithBalances = useMemo(() => {
    return tokens.map(token => {
      const userBalance = userBalances.find(
        balance => balance.token.toLowerCase() === token.address.toLowerCase()
      );
      
      if (userBalance) {
        const balanceNum = parseFloat(userBalance.balance) / Math.pow(10, userBalance.decimals);
        return {
          ...token,
          balance: balanceNum.toString(),
          balanceRaw: userBalance.balance,
          decimals: userBalance.decimals, // Use accurate decimals from balance API
        };
      }
      
      return token;
    });
  }, [tokens, userBalances]);

  // Filter tokens based on search and sort by activity/balance
  const filteredTokens = useMemo(() => {
    let filtered = tokensWithBalances;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = tokensWithBalances.filter(
        (token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query)
      );
    }
    
    // Sort by: 1) User balance (if any), 2) Activity (transfers24h), 3) Symbol
    return filtered.sort((a, b) => {
      const balanceA = parseFloat(a.balance) || 0;
      const balanceB = parseFloat(b.balance) || 0;
      
      // First priority: tokens user already owns
      if (balanceA > 0 && balanceB === 0) return -1;
      if (balanceB > 0 && balanceA === 0) return 1;
      
      // If both have balances, sort by balance amount
      if (balanceA > 0 && balanceB > 0) {
        return balanceB - balanceA;
      }
      
      // If neither has balance, sort by activity (transfers24h)
      const activityA = a.transfers24h || 0;
      const activityB = b.transfers24h || 0;
      
      if (activityA !== activityB) {
        return activityB - activityA; // More active tokens first
      }
      
      return a.symbol.localeCompare(b.symbol); // Alphabetical fallback
    });
  }, [tokensWithBalances, searchQuery]);

  const handleTokenSelect = (token: OutputToken) => {
    // Convert OutputToken to UnifiedToken format
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
      usdValue: 0 // Will be calculated elsewhere if needed
    };
    
    setTokenOut(unifiedToken);
    closeDrawer();
  };

  const getTokenBalance = (token: OutputToken): string => {
    const balance = parseFloat(token.balance) || 0;
    return formatBalance(balance);
  };

  const refreshTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const response: FetchTokenResponse = await fetchTokens({
        limit: 200,
        metadata: true
      });
      
      if (response.success) {
        const outputTokens: OutputToken[] = response.data.tokens
          .filter(token => token.address !== selectedTokenAddress)
          .map(token => ({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            balance: "0",
            balanceRaw: "0",
            logo: getTokenLogo(token.symbol),
            transfers24h: token.transfers24h
          }));
        
        setTokens(outputTokens);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Error refreshing output tokens:", error);
      setHasError(true);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const isLoading = isLoadingTokens || isLoadingBalances;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Select Output Token</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshTokens}
            disabled={isLoading}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh token list"
          >
            <RefreshCw className={`size-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
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
            placeholder="Search all available tokens..."
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
            <span className="text-gray-400">
              {isLoadingTokens ? "Loading available tokens..." : "Loading your balances..."}
            </span>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <span className="text-red-400 text-center mb-3">Error loading tokens</span>
            <button
              onClick={refreshTokens}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-gray-400">
              {searchQuery ? "No matching tokens found" : "No tokens available"}
            </span>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {filteredTokens.map((token) => {
              const tokenLogo = token.logo || getTokenLogo(token.symbol);
              const balance = getTokenBalance(token);
              const hasBalance = parseFloat(token.balance) > 0;
              const isActive = (token.transfers24h || 0) > 0;
              
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
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                            {token.symbol}
                          </p>
                          {hasBalance && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded">
                              Owned
                            </span>
                          )}
                          {isActive && !hasBalance && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded">
                              Active
                            </span>
                          )}
                        </div>
                        {token.name && (
                          <p className="text-sm text-gray-400 truncate max-w-40">
                            {token.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {hasBalance ? (
                          <>
                            <p className="text-white font-medium">{balance}</p>
                            <p className="text-xs text-gray-400">Your Balance</p>
                          </>
                        ) : isActive ? (
                          <>
                            <p className="text-blue-400 font-medium">{token.transfers24h}</p>
                            <p className="text-xs text-gray-400">24h Transfers</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">Available</p>
                        )}
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

export default SwapOutputTokenSelectorDrawer;
