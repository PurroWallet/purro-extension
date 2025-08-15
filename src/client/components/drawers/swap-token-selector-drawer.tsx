import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { X, Search, RefreshCw, BadgeCheck, ChevronDown } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";
import { UnifiedToken } from "@/client/components/token-list";
import { getTokenLogo } from "@/client/utils/icons";
import { Button, IconButton } from "@/client/components/ui/button";
import useSwapStore from "@/client/hooks/use-swap-store";
import useDrawerStore from "@/client/hooks/use-drawer-store";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { fetchBalances, fetchTokens } from "@/client/services/liquidswap-api";
import { Token as ApiToken } from "@/client/types/liquidswap-api";
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

interface Token {
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

interface SwapTokenSelectorDrawerProps {
  mode: "input" | "output"; // Determines which token is being selected
  selectedTokenAddress?: string; // To exclude from list
  excludeTokenAddress?: string; // Additional token to exclude (the other selected token)
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

const SwapTokenSelectorDrawer: React.FC<SwapTokenSelectorDrawerProps> = ({
  mode,
  selectedTokenAddress,
  excludeTokenAddress,
}) => {
  const { setTokenIn, setTokenOut, tokenOut } = useSwapStore();
  const { closeDrawer } = useDrawerStore();
  const { getActiveAccountWalletObject } = useWalletStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [userTokens, setUserTokens] = useState<Token[]>([]);
  const [isLoadingUserTokens, setIsLoadingUserTokens] = useState(true);
  const [hasUserTokensError, setHasUserTokensError] = useState(false);
  const [isYourTokensExpanded, setIsYourTokensExpanded] = useState(true);
  const [isDefaultTokensExpanded, setIsDefaultTokensExpanded] = useState(true);
  const [defaultTokenLogos, setDefaultTokenLogos] = useState<{
    [address: string]: string | null;
  }>({});

  // Infinite scroll state
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoadingMoreTokens, setIsLoadingMoreTokens] = useState(false);
  const [hasMoreTokens, setHasMoreTokens] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(20);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeAccountAddress = getActiveAccountWalletObject()?.eip155?.address;

  // Use TanStack Query hook for user balances only
  const {
    balances: userBalances,
    refetchBalances,
  } = useLiquidSwapTokens(0); // Set limit to 0 to only fetch balances

  // Fetch user balances which includes all token data
  useEffect(() => {
    const loadBalances = async () => {
      if (!activeAccountAddress) {
        setIsLoadingUserTokens(false);
        return;
      }

      try {
        setIsLoadingUserTokens(true);
        setHasUserTokensError(false);

        const response = await fetchBalances({
          wallet: activeAccountAddress,
          limit: 200,
        });

        console.log("User tokens - fetchBalances response:", response);

        if (response.success) {
          const tokenLogos = await Promise.all(
            response.data.tokens.map((balance) =>
              getTokenLogo(balance.symbol, "hyperevm", balance.token)
            )
          );

          // Convert Balance objects to Token format
          const userTokensList: Token[] = response.data.tokens.map(
            (balance, index) => {
              const balanceNum =
                parseFloat(balance.balance) / Math.pow(10, balance.decimals);

              const tokenAddress = balance.token
                .toLowerCase()
                .includes("native")
                ? "native" // Keep native tokens as "native" to distinguish from WHYPE
                : balance.token;
              return {
                address: tokenAddress,
                symbol: balance.symbol,
                name: balance.name,
                decimals: balance.decimals,
                balance: balanceNum.toString(),
                balanceRaw: balance.balance,
                logo: tokenLogos[index],
              };
            }
          );

          setUserTokens(userTokensList);
        } else {
          setHasUserTokensError(true);
        }
      } catch (error) {
        console.error("Error fetching user token balances:", error);
        setHasUserTokensError(true);
      } finally {
        setIsLoadingUserTokens(false);
      }
    };

    loadBalances();
  }, [activeAccountAddress, selectedTokenAddress, excludeTokenAddress]);

  // Initial load of tokens
  useEffect(() => {
    const loadInitialTokens = async () => {
      try {
        setIsLoadingMoreTokens(true);
        const response = await fetchTokens({
          limit: 20,
          metadata: true,
        });

        if (response.success) {
          // Convert API tokens to local Token interface
          const convertedTokens: Token[] = response.data.tokens.map(
            (apiToken: ApiToken) => ({
              address: apiToken.address,
              symbol: apiToken.symbol,
              name: apiToken.name,
              decimals: apiToken.decimals,
              balance: "0",
              balanceRaw: "0",
              transfers24h: apiToken.transfers24h,
              isERC20Verified: apiToken.isERC20Verified,
              totalTransfers: apiToken.totalTransfers,
            })
          );
          setAllTokens(convertedTokens);
          setHasMoreTokens(response.data.tokens.length === 20);
        }
      } catch (error) {
        console.error("Error loading initial tokens:", error);
      } finally {
        setIsLoadingMoreTokens(false);
      }
    };

    loadInitialTokens();
  }, []);

  // Load more tokens function
  const loadMoreTokens = useCallback(async () => {
    if (isLoadingMoreTokens || !hasMoreTokens) return;

    try {
      setIsLoadingMoreTokens(true);
      const newLimit = currentLimit + 20;

      const response = await fetchTokens({
        limit: newLimit,
        metadata: true,
      });

      if (response.success) {
        // Convert API tokens to local Token interface
        const convertedTokens: Token[] = response.data.tokens.map(
          (apiToken: ApiToken) => ({
            address: apiToken.address,
            symbol: apiToken.symbol,
            name: apiToken.name,
            decimals: apiToken.decimals,
            balance: "0",
            balanceRaw: "0",
            transfers24h: apiToken.transfers24h,
            isERC20Verified: apiToken.isERC20Verified,
            totalTransfers: apiToken.totalTransfers,
          })
        );
        setAllTokens(convertedTokens);
        setCurrentLimit(newLimit);
        setHasMoreTokens(response.data.tokens.length === newLimit);
      }
    } catch (error) {
      console.error("Error loading more tokens:", error);
    } finally {
      setIsLoadingMoreTokens(false);
    }
  }, [currentLimit, isLoadingMoreTokens, hasMoreTokens]);

  // Convert API tokens to Token format with WHYPE and HYPE as default tokens
  const defaultTokens = useMemo(() => {
    const tokens: Token[] = [];

    // Add HYPE native token using dead address convention
    const hypeToken: Token = {
      address: "0x000000000000000000000000000000000000dEaD",
      symbol: "HYPE",
      name: "Native HYPE",
      decimals: 18,
      balance: "0",
      balanceRaw: "0",
      logo: null, // Will be loaded asynchronously
      transfers24h: 0,
      isERC20Verified: true,
      totalTransfers: 0,
    };

    // Add WHYPE token
    const whypeToken: Token = {
      address: DEFAULT_WHYPE_TOKEN.address,
      symbol: DEFAULT_WHYPE_TOKEN.symbol,
      name: DEFAULT_WHYPE_TOKEN.name,
      decimals: DEFAULT_WHYPE_TOKEN.decimals,
      balance: "0",
      balanceRaw: "0",
      logo: null, // Will be loaded asynchronously
      transfers24h: DEFAULT_WHYPE_TOKEN.transfers24h,
      isERC20Verified: DEFAULT_WHYPE_TOKEN.isERC20Verified,
      totalTransfers: DEFAULT_WHYPE_TOKEN.totalTransfers,
    };

    // Always add both HYPE and WHYPE
    tokens.push(hypeToken);
    tokens.push(whypeToken);

    // Add other tokens from infinite scroll
    const otherTokens = allTokens
      .filter(
        (token) =>
          token.address !== DEFAULT_WHYPE_TOKEN.address && // Avoid duplicating WHYPE
          token.address !== "native" && // Avoid duplicating HYPE
          token.symbol !== "HYPE" // Avoid duplicating HYPE by symbol
      )
      .map((token) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balance: "0",
        balanceRaw: "0",
        logo: null, // Will be loaded asynchronously
        transfers24h: token.transfers24h,
        isERC20Verified: token.isERC20Verified,
        totalTransfers: token.totalTransfers,
      }));

    tokens.push(...otherTokens);
    return tokens;
  }, [allTokens, selectedTokenAddress, excludeTokenAddress]);

  // Load logos for default tokens asynchronously
  useEffect(() => {
    const loadDefaultTokenLogos = async () => {
      const logoPromises = defaultTokens.map(async (token) => {
        const logo = await getTokenLogo(
          token.symbol,
          "hyperevm",
          token.address
        );
        return { address: token.address, logo };
      });

      const logoResults = await Promise.all(logoPromises);
      const logoMap: { [address: string]: string | null } = {};

      logoResults.forEach(({ address, logo }) => {
        logoMap[address] = logo;
      });

      setDefaultTokenLogos(logoMap);
    };

    if (defaultTokens.length > 0) {
      loadDefaultTokenLogos();
    }
  }, [defaultTokens]);

  // Merge default tokens with user balances and logos
  const defaultTokensWithBalances = useMemo(() => {
    return defaultTokens.map((token) => {
      const userBalance = userBalances.find(
        (balance) => balance.token.toLowerCase() === token.address.toLowerCase()
      );

      const tokenWithLogo = {
        ...token,
        logo: defaultTokenLogos[token.address] || token.logo,
      };

      if (userBalance) {
        const balanceNum =
          parseFloat(userBalance.balance) / Math.pow(10, userBalance.decimals);
        return {
          ...tokenWithLogo,
          balance: balanceNum.toString(),
          balanceRaw: userBalance.balance,
          decimals: userBalance.decimals, // Use accurate decimals from balance API
        };
      }

      return tokenWithLogo;
    });
  }, [defaultTokens, userBalances, defaultTokenLogos]);

  // Filter user tokens based on search and sort by balance
  const filteredUserTokens = useMemo(() => {
    let filtered = userTokens;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = userTokens.filter(
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
  }, [userTokens, searchQuery]);

  // Filter default tokens based on search and sort by activity/balance
  const filteredDefaultTokens = useMemo(() => {
    let filtered = defaultTokensWithBalances;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = defaultTokensWithBalances.filter(
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
  }, [defaultTokensWithBalances, searchQuery]);



  // Auto-select WHYPE as default output token if no token is selected and mode is output
  useEffect(() => {
    if (
      mode === "output" &&
      !tokenOut &&
      !isLoadingMoreTokens &&
      defaultTokens.length > 0
    ) {
      // Find WHYPE token in the list
      const whypeToken = defaultTokens.find(
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
  }, [mode, tokenOut, isLoadingMoreTokens, defaultTokens, setTokenOut]);

  const handleTokenSelect = (token: Token) => {
    // Don't allow selection of disabled tokens
    if (isTokenDisabled(token)) {
      return;
    }

    console.log("🔍 Selected token:", token);

    // Don't convert HYPE token address - use the original address
    // The dead address should be preserved for HYPE tokens
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

    if (mode === "input") {
      setTokenIn(unifiedToken);
    } else {
      setTokenOut(unifiedToken);
    }
    closeDrawer();
  };

  const getTokenBalance = (token: Token): string => {
    const balance = parseFloat(token.balance) || 0;
    return formatBalance(balance);
  };

  // Helper functions to detect HYPE/WHYPE tokens
  const isHypeToken = (tokenAddress: string, tokenSymbol: string): boolean => {
    return (
      tokenSymbol === "HYPE" ||
      tokenAddress === "native" ||
      tokenAddress === "NATIVE" ||
      tokenAddress === "0x000000000000000000000000000000000000dEaD"
    );
  };

  const isWhypeToken = (tokenAddress: string, tokenSymbol: string): boolean => {
    return (
      tokenSymbol === "WHYPE" ||
      tokenAddress?.toLowerCase() === DEFAULT_WHYPE_TOKEN.address.toLowerCase()
    );
  };

  const isTokenDisabled = (token: Token): boolean => {
    // Don't disable if it's the exact same token address
    if (
      token.address === selectedTokenAddress ||
      token.address === excludeTokenAddress
    ) {
      return true;
    }

    // Allow HYPE/WHYPE combinations for wrapping/unwrapping
    const currentIsHype = isHypeToken(token.address, token.symbol);
    const currentIsWhype = isWhypeToken(token.address, token.symbol);

    // Check what tokens are currently selected/excluded
    // We need to check both by address and by inferring symbol from known addresses
    const selectedSymbol =
      selectedTokenAddress === "native" ||
      selectedTokenAddress === "0x000000000000000000000000000000000000dEaD"
        ? "HYPE"
        : selectedTokenAddress?.toLowerCase() ===
          DEFAULT_WHYPE_TOKEN.address.toLowerCase()
        ? "WHYPE"
        : "";
    const excludedSymbol =
      excludeTokenAddress === "native" ||
      excludeTokenAddress === "0x000000000000000000000000000000000000dEaD"
        ? "HYPE"
        : excludeTokenAddress?.toLowerCase() ===
          DEFAULT_WHYPE_TOKEN.address.toLowerCase()
        ? "WHYPE"
        : "";

    const selectedIsHype = isHypeToken(
      selectedTokenAddress || "",
      selectedSymbol
    );
    const selectedIsWhype = isWhypeToken(
      selectedTokenAddress || "",
      selectedSymbol
    );
    const excludedIsHype = isHypeToken(
      excludeTokenAddress || "",
      excludedSymbol
    );
    const excludedIsWhype = isWhypeToken(
      excludeTokenAddress || "",
      excludedSymbol
    );

    // Special handling for HYPE/WHYPE pairs
    // Never disable HYPE or WHYPE when the other is selected (allow wrap/unwrap)
    if (
      (currentIsHype && (selectedIsWhype || excludedIsWhype)) ||
      (currentIsWhype && (selectedIsHype || excludedIsHype))
    ) {
      console.log("🔄 Allowing HYPE/WHYPE combination for wrap/unwrap");
      return false; // Allow HYPE ↔ WHYPE combinations
    }

    // Disable same token types to prevent duplicate selection
    if (currentIsHype && (selectedIsHype || excludedIsHype)) {
      console.log("🚫 Disabling HYPE (already selected)");
      return true; // Disable HYPE if HYPE is already selected
    }

    if (currentIsWhype && (selectedIsWhype || excludedIsWhype)) {
      console.log("🚫 Disabling WHYPE (already selected)");
      return true; // Disable WHYPE if WHYPE is already selected
    }

    return false; // Don't disable other tokens
  };

  const refreshBalances = async () => {
    if (!activeAccountAddress) return;

    setIsLoadingUserTokens(true);
    try {
      const response = await fetchBalances({
        wallet: activeAccountAddress,
        limit: 200,
      });

      const tokenLogos = await Promise.all(
        response.data.tokens.map((balance) =>
          getTokenLogo(balance.symbol, "hyperevm", balance.token)
        )
      );

      if (response.success) {
        // Convert Balance objects to Token format
        const userTokensList: Token[] = response.data.tokens.map(
          (balance, index) => {
            const balanceNum =
              parseFloat(balance.balance) / Math.pow(10, balance.decimals);
            const tokenAddress = balance.token.toLowerCase().includes("native")
              ? "native" // Keep native tokens as "native" to distinguish from WHYPE
              : balance.token;
            return {
              address: tokenAddress,
              symbol: balance.symbol,
              name: balance.name,
              decimals: balance.decimals,
              balance: balanceNum.toString(),
              balanceRaw: balance.balance,
              logo: tokenLogos[index],
            };
          }
        );

        setUserTokens(userTokensList);
        setHasUserTokensError(false);
      } else {
        setHasUserTokensError(true);
      }
    } catch (error) {
      console.error("Error refreshing user token balances:", error);
      setHasUserTokensError(true);
    } finally {
      setIsLoadingUserTokens(false);
    }

    // Also refresh balances and reload tokens
    refetchBalances();

    // Reset and reload tokens
    setAllTokens([]);
    setCurrentLimit(20);
    setHasMoreTokens(true);

    try {
      const response = await fetchTokens({
        limit: 20,
        metadata: true,
      });

      if (response.success) {
        // Convert API tokens to local Token interface
        const convertedTokens: Token[] = response.data.tokens.map(
          (apiToken: ApiToken) => ({
            address: apiToken.address,
            symbol: apiToken.symbol,
            name: apiToken.name,
            decimals: apiToken.decimals,
            balance: "0",
            balanceRaw: "0",
            transfers24h: apiToken.transfers24h,
            isERC20Verified: apiToken.isERC20Verified,
            totalTransfers: apiToken.totalTransfers,
          })
        );
        setAllTokens(convertedTokens);
        setHasMoreTokens(response.data.tokens.length === 20);
      }
    } catch (error) {
      console.error("Error refreshing tokens:", error);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-[var(--background-color)] rounded-t-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[var(--card-color)]/50">
        <h2 className="text-lg font-semibold text-[var(--text-color)]">
          Select {mode === "input" ? "Input" : "Output"} Token
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshBalances}
            disabled={isLoadingUserTokens || isLoadingMoreTokens}
            className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--card-color)]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh token list"
          >
            <RefreshCw
              className={`size-4 text-[var(--primary-color-light)] ${
                isLoadingUserTokens || isLoadingMoreTokens ? "animate-spin" : ""
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
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--card-color)]/50 border border-[var(--primary-color)]/20 rounded-lg text-[var(--text-color)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] focus:border-[var(--primary-color-light)] transition-all duration-300"
          />
        </div>
      </div>

      {/* Token List */}
      <div
        id="scrollable-container"
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-[var(--background-color)]"
      >
        {/* Your Tokens Section */}
        <div className="border-b border-white/10">
          <button
            onClick={() => setIsYourTokensExpanded(!isYourTokensExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-color)]/30 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-[var(--text-color)] font-medium">
                Your Tokens
              </h3>
            </div>
            <ChevronDown
              className={`size-4 text-[var(--text-color)] transition-transform duration-300 ${
                isYourTokensExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {isYourTokensExpanded && (
            <div className="">
              {isLoadingUserTokens ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-color-light)] mr-2"></div>
                  <span className="text-white/60">Loading your tokens...</span>
                </div>
              ) : hasUserTokensError ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <span className="text-[var(--button-color-destructive)] text-center mb-3">
                    Error loading your tokens
                  </span>
                  <Button
                    onClick={refreshBalances}
                    variant="primary"
                    className="px-3 py-1 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredUserTokens.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-white/60">
                    {searchQuery
                      ? "No matching tokens found"
                      : "You don't have any tokens yet"}
                  </span>
                </div>
              ) : (
                <div className="">
                  {filteredUserTokens.map((token) => {
                    const tokenLogo = token.logo; // User tokens already have logos loaded
                    const balance = getTokenBalance(token);
                    const hasBalance = parseFloat(token.balance) > 0;
                    const disabled = isTokenDisabled(token);

                    return (
                      <button
                        key={token.address}
                        onClick={() => handleTokenSelect(token)}
                        disabled={disabled}
                        className={`w-full flex items-center py-3 px-4 transition-all duration-300 group ${
                          disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[var(--primary-color)]/20"
                        }`}
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
                                <p
                                  className={`font-medium transition-colors duration-300 ${
                                    disabled
                                      ? "text-[var(--text-color)]/50"
                                      : "text-[var(--text-color)] group-hover:text-[var(--primary-color-light)]"
                                  }`}
                                >
                                  {token.symbol}
                                </p>
                                {disabled && (
                                  <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded font-medium">
                                    Selected
                                  </span>
                                )}
                                {hasBalance && !disabled && (
                                  <span className="px-1.5 py-0.5 text-xs bg-[var(--primary-color)] text-black rounded font-medium">
                                    Owned
                                  </span>
                                )}
                              </div>
                              {token.name && (
                                <p
                                  className={`text-sm truncate max-w-40 ${
                                    disabled ? "text-white/30" : "text-white/60"
                                  }`}
                                >
                                  {token.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-medium ${
                                  disabled
                                    ? "text-[var(--text-color)]/50"
                                    : "text-[var(--text-color)]"
                                }`}
                              >
                                {balance}
                              </p>
                              <p
                                className={`text-xs ${
                                  disabled ? "text-white/30" : "text-white/60"
                                }`}
                              >
                                Your Balance
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Default Tokens Section */}
        <div className="">
          <button
            onClick={() => setIsDefaultTokensExpanded(!isDefaultTokensExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-color)]/30 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-[var(--text-color)] font-medium">
                Default Tokens
              </h3>
            </div>
            <ChevronDown
              className={`size-4 text-[var(--text-color)] transition-transform duration-300 ${
                isDefaultTokensExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDefaultTokensExpanded && (
            <div className="">
              {allTokens.length === 0 && isLoadingMoreTokens ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-color-light)] mr-2"></div>
                  <span className="text-white/60">Loading tokens...</span>
                </div>
              ) : filteredDefaultTokens.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-white/60">
                    {searchQuery
                      ? "No matching tokens found"
                      : "No tokens available"}
                  </span>
                </div>
              ) : (
                <InfiniteScroll
                  dataLength={filteredDefaultTokens.length}
                  next={loadMoreTokens}
                  hasMore={hasMoreTokens}
                  loader={
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--primary-color-light)] mr-2"></div>
                      <span className="text-white/60 text-sm">
                        Loading more tokens...
                      </span>
                    </div>
                  }
                  endMessage={
                    !searchQuery && (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-white/40 text-sm">
                          No more tokens to load
                        </span>
                      </div>
                    )
                  }
                  scrollableTarget="scrollable-container"
                  className=""
                >
                  {filteredDefaultTokens.map((token) => {
                    const tokenLogo = token.logo; // Logos are now loaded in defaultTokensWithBalances
                    const balance = getTokenBalance(token);
                    const hasBalance = parseFloat(token.balance) > 0;
                    const isActive = (token.transfers24h || 0) > 0;
                    const isVerified = token.isERC20Verified;
                    const disabled = isTokenDisabled(token);

                    return (
                      <button
                        key={token.address}
                        onClick={() => handleTokenSelect(token)}
                        disabled={disabled}
                        className={`w-full flex items-center py-3 px-4 transition-all duration-300 group ${
                          disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[var(--primary-color)]/20"
                        }`}
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
                                <p
                                  className={`font-medium transition-colors duration-300 ${
                                    disabled
                                      ? "text-[var(--text-color)]/50"
                                      : "text-[var(--text-color)] group-hover:text-[var(--primary-color-light)]"
                                  }`}
                                >
                                  {token.symbol}
                                </p>
                                {disabled && (
                                  <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded font-medium">
                                    Selected
                                  </span>
                                )}
                                {hasBalance && !disabled && (
                                  <span className="px-1.5 py-0.5 text-xs bg-[var(--primary-color)] text-black rounded font-medium">
                                    Owned
                                  </span>
                                )}
                                {isVerified && !hasBalance && !disabled && (
                                  <BadgeCheck
                                    className={`size-4 ${
                                      disabled
                                        ? "text-[var(--primary-color-light)]/50"
                                        : "text-[var(--primary-color-light)]"
                                    }`}
                                  />
                                )}
                              </div>
                              {token.name && (
                                <p
                                  className={`text-sm truncate max-w-40 ${
                                    disabled ? "text-white/30" : "text-white/60"
                                  }`}
                                >
                                  {token.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {hasBalance ? (
                                <>
                                  <p
                                    className={`font-medium ${
                                      disabled
                                        ? "text-[var(--text-color)]/50"
                                        : "text-[var(--text-color)]"
                                    }`}
                                  >
                                    {balance}
                                  </p>
                                  <p
                                    className={`text-xs ${
                                      disabled
                                        ? "text-white/30"
                                        : "text-white/60"
                                    }`}
                                  >
                                    Your Balance
                                  </p>
                                </>
                              ) : isActive ? (
                                <>
                                  <p
                                    className={`font-medium ${
                                      disabled
                                        ? "text-[var(--primary-color-light)]/50"
                                        : "text-[var(--primary-color-light)]"
                                    }`}
                                  >
                                    {token.transfers24h}
                                  </p>
                                  <p
                                    className={`text-xs ${
                                      disabled
                                        ? "text-white/30"
                                        : "text-white/60"
                                    }`}
                                  >
                                    24h Transfers
                                  </p>
                                </>
                              ) : (
                                <p
                                  className={`text-xs ${
                                    disabled ? "text-white/20" : "text-white/40"
                                  }`}
                                >
                                  Available
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </InfiniteScroll>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Legacy exports for backward compatibility
export const SwapInputTokenSelectorDrawer: React.FC<{
  selectedTokenAddress?: string;
}> = ({ selectedTokenAddress }) => (
  <SwapTokenSelectorDrawer
    mode="input"
    excludeTokenAddress={selectedTokenAddress}
  />
);

export const SwapOutputTokenSelectorDrawer: React.FC<{
  selectedTokenAddress?: string;
}> = ({ selectedTokenAddress }) => (
  <SwapTokenSelectorDrawer
    mode="output"
    excludeTokenAddress={selectedTokenAddress}
  />
);

export default SwapTokenSelectorDrawer;
