import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { X, Search, RefreshCw, BadgeCheck } from 'lucide-react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { UnifiedToken } from '@/client/components/token-list';
import { ChainType } from '@/client/types/wallet';
import { getTokenLogo } from '@/client/utils/icons';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui/dialog';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { fetchTokens } from '@/client/services/liquidswap-api';
import { Token as ApiToken } from '@/client/types/liquidswap-api';
import useLiquidSwapTokens from '@/client/hooks/use-liquidswap-tokens';
import useSwapStore from '@/client/hooks/use-swap-store';
import useMainScreenStore from '@/client/hooks/use-main-screen-store';

// Constants for formatting balance
const formatBalance = (balance: number): string => {
  if (balance === 0) return '0';
  if (balance < 0.000001) return '<0.000001';
  if (balance < 1) return balance.toFixed(6);
  if (balance < 1000) return balance.toFixed(4);
  if (balance < 1000000) return (balance / 1000).toFixed(2) + 'K';
  return (balance / 1000000).toFixed(2) + 'M';
};

// Default WHYPE token data
const DEFAULT_WHYPE_TOKEN = {
  address: '0x5555555555555555555555555555555555555555',
  name: 'Wrapped HYPE',
  symbol: 'WHYPE',
  decimals: 18,
  isERC20Verified: true,
  totalTransfers: 1280900,
  transfers24h: 61195,
};

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceRaw: string;
  logo?: string | null;
  transfers24h?: number;
  isERC20Verified?: boolean;
  totalTransfers?: number;
}

interface TokenSelectorDialogProps {
  excludeTokenAddress?: string;
  title?: string;
}

export const TokenSelectorDialog: React.FC<TokenSelectorDialogProps> = ({
  excludeTokenAddress,
  title = 'Tokens on HyperEVM',
}) => {
  const { closeDialog } = useDialogStore();
  const { setTokenOut } = useSwapStore();
  const { setMainScreen } = useMainScreenStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [defaultTokenLogos, setDefaultTokenLogos] = useState<{
    [address: string]: string | null;
  }>({});

  // Infinite scroll state
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoadingMoreTokens, setIsLoadingMoreTokens] = useState(false);
  const [hasMoreTokens, setHasMoreTokens] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(20);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use TanStack Query hook for user balances
  const { balances: userBalances, refetchBalances } = useLiquidSwapTokens(0);

  // Load tokens based on search query
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setIsLoadingMoreTokens(true);
        setAllTokens([]);
        setCurrentLimit(20);
        setHasMoreTokens(true);

        const response = await fetchTokens({
          limit: 20,
          metadata: true,
          search: debouncedSearchQuery.trim() || undefined,
        });

        if (response.success) {
          const convertedTokens: Token[] = response.data.tokens.map(
            (apiToken: ApiToken) => ({
              address: apiToken.address,
              symbol: apiToken.symbol,
              name: apiToken.name,
              decimals: apiToken.decimals,
              balance: '0',
              balanceRaw: '0',
              transfers24h: apiToken.transfers24h,
              isERC20Verified: apiToken.isERC20Verified,
              totalTransfers: apiToken.totalTransfers,
            })
          );
          setAllTokens(convertedTokens);
          setHasMoreTokens(response.data.tokens.length === 20);
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
      } finally {
        setIsLoadingMoreTokens(false);
      }
    };

    loadTokens();
  }, [debouncedSearchQuery]);

  // Load more tokens function
  const loadMoreTokens = useCallback(async () => {
    if (isLoadingMoreTokens || !hasMoreTokens) return;

    try {
      setIsLoadingMoreTokens(true);
      const newLimit = currentLimit + 20;

      const response = await fetchTokens({
        limit: newLimit,
        metadata: true,
        search: debouncedSearchQuery.trim() || undefined,
      });

      if (response.success) {
        const convertedTokens: Token[] = response.data.tokens.map(
          (apiToken: ApiToken) => ({
            address: apiToken.address,
            symbol: apiToken.symbol,
            name: apiToken.name,
            decimals: apiToken.decimals,
            balance: '0',
            balanceRaw: '0',
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
      console.error('Error loading more tokens:', error);
    } finally {
      setIsLoadingMoreTokens(false);
    }
  }, [currentLimit, isLoadingMoreTokens, hasMoreTokens, debouncedSearchQuery]);

  // Convert API tokens to Token format with WHYPE and HYPE as default tokens
  const defaultTokens = useMemo(() => {
    const tokens: Token[] = [];

    // Add HYPE native token
    const hypeToken: Token = {
      address: '0x000000000000000000000000000000000000dEaD',
      symbol: 'HYPE',
      name: 'Native HYPE',
      decimals: 18,
      balance: '0',
      balanceRaw: '0',
      logo: null,
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
      balance: '0',
      balanceRaw: '0',
      logo: null,
      transfers24h: DEFAULT_WHYPE_TOKEN.transfers24h,
      isERC20Verified: DEFAULT_WHYPE_TOKEN.isERC20Verified,
      totalTransfers: DEFAULT_WHYPE_TOKEN.totalTransfers,
    };

    tokens.push(hypeToken);
    tokens.push(whypeToken);

    const otherTokens = allTokens
      .filter(
        token =>
          token.address !== DEFAULT_WHYPE_TOKEN.address &&
          token.address !== 'native' &&
          token.symbol !== 'HYPE'
      )
      .map(token => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balance: '0',
        balanceRaw: '0',
        logo: null,
        transfers24h: token.transfers24h,
        isERC20Verified: token.isERC20Verified,
        totalTransfers: token.totalTransfers,
      }));

    tokens.push(...otherTokens);
    return tokens;
  }, [allTokens]);

  // Load logos for default tokens
  useEffect(() => {
    const loadDefaultTokenLogos = async () => {
      const logoPromises = defaultTokens.map(async token => {
        const logo = await getTokenLogo(
          token.symbol,
          'hyperevm',
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
    return defaultTokens.map(token => {
      const userBalance = userBalances.find(
        balance => balance.token.toLowerCase() === token.address.toLowerCase()
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
          decimals: userBalance.decimals,
        };
      }

      return tokenWithLogo;
    });
  }, [defaultTokens, userBalances, defaultTokenLogos]);

  // Filter tokens based on search
  const filteredTokens = useMemo(() => {
    let filtered = defaultTokensWithBalances;

    if (searchQuery.trim() && !debouncedSearchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = defaultTokensWithBalances.filter(
        token =>
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const balanceA = parseFloat(a.balance) || 0;
      const balanceB = parseFloat(b.balance) || 0;

      if (balanceA > 0 && balanceB === 0) return -1;
      if (balanceB > 0 && balanceA === 0) return 1;

      if (balanceA > 0 && balanceB > 0) {
        return balanceB - balanceA;
      }

      const activityA = a.transfers24h || 0;
      const activityB = b.transfers24h || 0;

      if (activityA !== activityB) {
        return activityB - activityA;
      }

      return a.symbol.localeCompare(b.symbol);
    });
  }, [defaultTokensWithBalances, searchQuery, debouncedSearchQuery]);

  const handleTokenSelect = (token: Token) => {
    // Skip if token is excluded
    if (token.address === excludeTokenAddress) {
      return;
    }

    const unifiedToken: UnifiedToken = {
      contractAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      balance: token.balanceRaw,
      chain: 'hyperevm' as ChainType,
      chainName: 'HyperEVM',
      logo: token.logo || undefined,
      balanceFormatted: parseFloat(token.balance) || 0,
      usdValue: 0,
    };

    // Set as output token for swap
    setTokenOut(unifiedToken);

    // Navigate to swap screen
    setMainScreen('swap');

    // Close dialog
    closeDialog();
  };

  const getTokenBalance = (token: Token): string => {
    const balance = parseFloat(token.balance) || 0;
    return formatBalance(balance);
  };

  const refreshTokens = async () => {
    setAllTokens([]);
    setCurrentLimit(20);
    setHasMoreTokens(true);

    try {
      const response = await fetchTokens({
        limit: 20,
        metadata: true,
        search: debouncedSearchQuery.trim() || undefined,
      });

      if (response.success) {
        const convertedTokens: Token[] = response.data.tokens.map(
          (apiToken: ApiToken) => ({
            address: apiToken.address,
            symbol: apiToken.symbol,
            name: apiToken.name,
            decimals: apiToken.decimals,
            balance: '0',
            balanceRaw: '0',
            transfers24h: apiToken.transfers24h,
            isERC20Verified: apiToken.isERC20Verified,
            totalTransfers: apiToken.totalTransfers,
          })
        );
        setAllTokens(convertedTokens);
        setHasMoreTokens(response.data.tokens.length === 20);
      }
    } catch (error) {
      console.error('Error refreshing tokens:', error);
    }

    // Also refresh balances
    refetchBalances();
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title={title}
        onClose={closeDialog}
        icon={<X className="size-4 text-white" />}
        rightContent={
          <button
            onClick={refreshTokens}
            disabled={isLoadingMoreTokens}
            className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--card-color)]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh token list"
          >
            <RefreshCw
              className={`size-4 text-[var(--primary-color-light)] ${
                isLoadingMoreTokens ? 'animate-spin' : ''
              }`}
            />
          </button>
        }
      />

      {/* Search */}
      <div className="p-4 border-b border-white/10 bg-[var(--card-color)]/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-[var(--primary-color-light)]" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--card-color)]/50 border border-[var(--primary-color)]/20 rounded-lg text-[var(--text-color)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] focus:border-[var(--primary-color-light)] transition-all duration-300"
          />
        </div>
      </div>

      <DialogContent className="p-0">
        <div
          id="scrollable-container"
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-[var(--background-color)]"
        >
          {allTokens.length === 0 && isLoadingMoreTokens ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-color-light)] mr-2"></div>
              <span className="text-white/60">Loading tokens...</span>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-white/60">
                {searchQuery
                  ? 'No matching tokens found'
                  : 'No tokens available'}
              </span>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={filteredTokens.length}
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
              {filteredTokens.map(token => {
                const tokenLogo = token.logo;
                const balance = getTokenBalance(token);
                const hasBalance = parseFloat(token.balance) > 0;
                const isActive = (token.transfers24h || 0) > 0;
                const isVerified = token.isERC20Verified;
                const disabled = token.address === excludeTokenAddress;

                return (
                  <button
                    key={token.address}
                    onClick={() => handleTokenSelect(token)}
                    disabled={disabled}
                    className={`w-full flex items-center py-3 px-4 transition-all duration-300 group ${
                      disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-[var(--primary-color)]/20'
                    }`}
                  >
                    {/* Token Icon */}
                    <div className="size-10 flex items-center justify-center bg-[var(--card-color)]/50 rounded-full mr-3 overflow-hidden border border-white/10">
                      {tokenLogo ? (
                        <img
                          src={tokenLogo}
                          alt={token.symbol}
                          className="size-10 rounded-full"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
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
                                  ? 'text-[var(--text-color)]/50'
                                  : 'text-[var(--text-color)] group-hover:text-[var(--primary-color-light)]'
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
                                    ? 'text-[var(--primary-color-light)]/50'
                                    : 'text-[var(--primary-color-light)]'
                                }`}
                              />
                            )}
                          </div>
                          {token.name && (
                            <p
                              className={`text-sm truncate max-w-40 ${
                                disabled ? 'text-white/30' : 'text-white/60'
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
                                    ? 'text-[var(--text-color)]/50'
                                    : 'text-[var(--text-color)]'
                                }`}
                              >
                                {balance}
                              </p>
                              <p
                                className={`text-xs ${
                                  disabled ? 'text-white/30' : 'text-white/60'
                                }`}
                              >
                                Balance
                              </p>
                            </>
                          ) : isActive ? (
                            <>
                              <p
                                className={`font-medium ${
                                  disabled
                                    ? 'text-[var(--primary-color-light)]/50'
                                    : 'text-[var(--primary-color-light)]'
                                }`}
                              >
                                {token.transfers24h}
                              </p>
                              <p
                                className={`text-xs ${
                                  disabled ? 'text-white/30' : 'text-white/60'
                                }`}
                              >
                                24h Transfers
                              </p>
                            </>
                          ) : (
                            <p
                              className={`text-xs ${
                                disabled ? 'text-white/20' : 'text-white/40'
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
      </DialogContent>
    </DialogWrapper>
  );
};
