import React, { useState, useMemo, useEffect } from "react";
import { X, Search, RefreshCw, BadgeCheck } from "lucide-react";
import { UnifiedToken } from "@/client/components/token-list";
import { getTokenLogo } from "@/client/utils/icons";
import { Button, IconButton } from "@/client/components/ui/button";
import useSwapStore from "@/client/hooks/use-swap-store";
import useDrawerStore from "@/client/hooks/use-drawer-store";
import useLiquidSwapTokens from "@/client/hooks/use-liquidswap-tokens";

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
  isERC20Verified?: boolean;
  totalTransfers?: number;
}

interface SwapOutputTokenSelectorDrawerProps {
  selectedTokenAddress?: string; // To exclude from list
}

// Default WHYPE token data
const DEFAULT_WHYPE_TOKEN = {
  address: "0x5555555555555555555555555555555555555555",
  name: "Wrapped HYPE",
  symbol: "WHYPE",
  decimals: 18,
  isERC20Verified: true,
  totalTransfers: 1280900,
  transfers24h: 61195,
};

const SwapOutputTokenSelectorDrawer: React.FC<
  SwapOutputTokenSelectorDrawerProps
> = ({ selectedTokenAddress }) => {
  const { setTokenOut, tokenOut } = useSwapStore();
  const { closeDrawer } = useDrawerStore();

  const [searchQuery, setSearchQuery] = useState("");

  // Use TanStack Query hook for data fetching
  const {
    tokens: apiTokens,
    balances: userBalances,
    isLoading,
    hasError,
    refetchAll,
  } = useLiquidSwapTokens();

  // Convert API tokens to OutputToken format with WHYPE as default first
  const tokens = useMemo(() => {
    const outputTokens: OutputToken[] = [];

    // Add WHYPE as the first token (default selection)
    const whypeToken: OutputToken = {
      address: DEFAULT_WHYPE_TOKEN.address,
      symbol: DEFAULT_WHYPE_TOKEN.symbol,
      name: DEFAULT_WHYPE_TOKEN.name,
      decimals: DEFAULT_WHYPE_TOKEN.decimals,
      balance: "0",
      balanceRaw: "0",
      logo: getTokenLogo(DEFAULT_WHYPE_TOKEN.symbol),
      transfers24h: DEFAULT_WHYPE_TOKEN.transfers24h,
      isERC20Verified: DEFAULT_WHYPE_TOKEN.isERC20Verified,
      totalTransfers: DEFAULT_WHYPE_TOKEN.totalTransfers,
    };

    // Only add WHYPE if it's not the selected input token
    if (DEFAULT_WHYPE_TOKEN.address !== selectedTokenAddress) {
      outputTokens.push(whypeToken);
    }

    // Add other tokens from API
    const otherTokens = apiTokens
      .filter(
        (token) =>
          token.address !== selectedTokenAddress &&
          token.address !== DEFAULT_WHYPE_TOKEN.address // Avoid duplicating WHYPE
      )
      .map((token) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balance: "0",
        balanceRaw: "0",
        logo: getTokenLogo(token.symbol),
        transfers24h: token.transfers24h,
        isERC20Verified: token.isERC20Verified,
        totalTransfers: token.totalTransfers,
      }));

    outputTokens.push(...otherTokens);
    return outputTokens;
  }, [apiTokens, selectedTokenAddress]);

  // Auto-select WHYPE as default output token if no token is selected
  useEffect(() => {
    if (!tokenOut && !isLoading && tokens.length > 0) {
      // Find WHYPE token in the list
      const whypeToken = tokens.find(
        (token) => token.address === DEFAULT_WHYPE_TOKEN.address
      );

      if (whypeToken) {
        const unifiedToken: UnifiedToken = {
          contractAddress: whypeToken.address,
          symbol: whypeToken.symbol,
          name: whypeToken.name,
          decimals: whypeToken.decimals,
          balance: whypeToken.balanceRaw,
          chain: "hyperevm",
          chainName: "HyperEVM",
          logo: whypeToken.logo || undefined,
          balanceFormatted: parseFloat(whypeToken.balance) || 0,
          usdValue: 0,
        };

        setTokenOut(unifiedToken);
      }
    }
  }, [tokenOut, isLoading, tokens, setTokenOut]);

  // Merge tokens with user balances
  const tokensWithBalances = useMemo(() => {
    return tokens.map((token) => {
      const userBalance = userBalances.find(
        (balance) => balance.token.toLowerCase() === token.address.toLowerCase()
      );

      if (userBalance) {
        const balanceNum =
          parseFloat(userBalance.balance) / Math.pow(10, userBalance.decimals);
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
      usdValue: 0, // Will be calculated elsewhere if needed
    };

    setTokenOut(unifiedToken);
    closeDrawer();
  };

  const getTokenBalance = (token: OutputToken): string => {
    const balance = parseFloat(token.balance) || 0;
    return formatBalance(balance);
  };

  const refreshTokens = () => {
    refetchAll();
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-[var(--background-color)] rounded-t-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[var(--card-color)]/50">
        <h2 className="text-lg font-semibold text-[var(--text-color)]">
          Select Output Token
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshTokens}
            disabled={isLoading}
            className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--card-color)]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh token list"
          >
            <RefreshCw
              className={`size-4 text-[var(--primary-color-light)] ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
          <IconButton onClick={closeDrawer}>
            <X className="size-4 text-[var(--text-color)]" />
          </IconButton>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-white/10 bg-[var(--card-color)]/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-[var(--primary-color-light)]" />
          <input
            type="text"
            placeholder="Search all available tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--card-color)]/50 border border-[var(--primary-color)]/20 rounded-lg text-[var(--text-color)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] focus:border-[var(--primary-color-light)] transition-all duration-300"
          />
        </div>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto bg-[var(--background-color)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-color-light)] mr-2"></div>
            <span className="text-white/60">
              Loading tokens and balances...
            </span>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <span className="text-[var(--button-color-destructive)] text-center mb-3">
              Error loading tokens
            </span>
            <Button
              onClick={refreshTokens}
              variant="primary"
              className="px-3 py-1 text-xs"
            >
              Retry
            </Button>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-white/60">
              {searchQuery ? "No matching tokens found" : "No tokens available"}
            </span>
          </div>
        ) : (
          <div className="">
            {filteredTokens.map((token) => {
              const tokenLogo = token.logo || getTokenLogo(token.symbol);
              const balance = getTokenBalance(token);
              const hasBalance = parseFloat(token.balance) > 0;
              const isActive = (token.transfers24h || 0) > 0;
              const isVerified = token.isERC20Verified;

              return (
                <button
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full flex items-center py-3 px-4 hover:bg-[var(--primary-color)]/20 transition-all duration-300 group"
                >
                  {/* Token Icon */}
                  <div className="size-10 flex items-center justify-center bg-[var(--card-color)]/50 rounded-full mr-3 overflow-hidden border border-white/10">
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
                      <span className="text-xs font-medium text-[var(--primary-color-light)]">
                        {token.symbol.slice(0, 3)}
                      </span>
                    )}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--text-color)] font-medium group-hover:text-[var(--primary-color-light)] transition-colors duration-300">
                            {token.symbol}
                          </p>
                          {hasBalance && (
                            <span className="px-1.5 py-0.5 text-xs bg-[var(--primary-color)] text-black rounded font-medium">
                              Owned
                            </span>
                          )}
                          {isVerified && !hasBalance && (
                            <BadgeCheck className="size-4 text-[var(--primary-color-light)]" />
                          )}
                        </div>
                        {token.name && (
                          <p className="text-sm text-white/60 truncate max-w-40">
                            {token.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {hasBalance ? (
                          <>
                            <p className="text-[var(--text-color)] font-medium">
                              {balance}
                            </p>
                            <p className="text-xs text-white/60">
                              Your Balance
                            </p>
                          </>
                        ) : isActive ? (
                          <>
                            <p className="text-[var(--primary-color-light)] font-medium">
                              {token.transfers24h}
                            </p>
                            <p className="text-xs text-white/60">
                              24h Transfers
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-white/40">Available</p>
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
