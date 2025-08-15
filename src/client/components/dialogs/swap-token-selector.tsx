import React, { useState, useMemo } from "react";
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  Input,
} from "@/client/components/ui";
import { X, Search } from "lucide-react";
import { UnifiedToken } from "@/client/components/token-list";
import { useUnifiedTokens } from "@/client/hooks/use-unified-tokens";
import { getTokenLogo } from "@/client/utils/icons";
// Simple formatBalance function
const formatBalance = (balance: number): string => {
  if (balance === 0) return "0";
  if (balance < 0.000001) return "<0.000001";
  if (balance < 1) return balance.toFixed(6);
  if (balance < 1000) return balance.toFixed(4);
  if (balance < 1000000) return (balance / 1000).toFixed(2) + "K";
  return (balance / 1000000).toFixed(2) + "M";
};
import useSwapStore from "@/client/hooks/use-swap-store";

interface SwapTokenSelectorProps {
  onClose: () => void;
  selectedTokenAddress?: string; // To exclude from list
  title: string;
}

const SwapTokenSelector: React.FC<SwapTokenSelectorProps> = ({
  onClose,
  selectedTokenAddress,
  title,
}) => {
  const { allUnifiedTokens, isLoading, hasError } = useUnifiedTokens();
  const { showTokenSelector, setTokenIn, setTokenOut, setShowTokenSelector } = useSwapStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter HyperEVM tokens for swapping
  const hyperEvmTokens = useMemo(() => {
    return allUnifiedTokens.filter(
      (token) =>
        token.chain === "hyperevm" &&
        token.contractAddress !== selectedTokenAddress
    );
  }, [allUnifiedTokens, selectedTokenAddress]);

  // Filter tokens based on search
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return hyperEvmTokens;
    
    const query = searchQuery.toLowerCase();
    return hyperEvmTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name?.toLowerCase().includes(query) ||
        token.contractAddress.toLowerCase().includes(query)
    );
  }, [hyperEvmTokens, searchQuery]);

  const handleTokenSelect = (token: UnifiedToken) => {
    if (showTokenSelector === "in") {
      setTokenIn(token);
    } else if (showTokenSelector === "out") {
      setTokenOut(token);
    }
    setShowTokenSelector(null);
    onClose();
  };

  const getTokenBalance = (token: UnifiedToken): string => {
    if (!token.balance) return "0";
    try {
      const balance = parseFloat(token.balance) / Math.pow(10, token.decimals || 18);
      return formatBalance(balance);
    } catch {
      return "0";
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title={title}
        onClose={onClose}
        rightContent={
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="size-4 text-white" />
          </button>
        }
      />
      
      <DialogContent>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search tokens by name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Token List */}
          <div className="max-h-96 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                <span className="text-gray-400">Loading tokens...</span>
              </div>
            ) : hasError ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-red-400">Error loading tokens</span>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-gray-400">
                  {searchQuery ? "No tokens found" : "No HyperEVM tokens available"}
                </span>
              </div>
            ) : (
              filteredTokens.map((token) => {
                const tokenLogo = token.logo || getTokenLogo(token.symbol);
                const balance = getTokenBalance(token);
                
                return (
                  <button
                    key={token.contractAddress}
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
                          <p className="text-white font-medium">{balance}</p>
                          <p className="text-xs text-gray-400">Balance</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
      
      <DialogFooter>
        <Button onClick={onClose} variant="secondary" className="w-full">
          Cancel
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default SwapTokenSelector;
