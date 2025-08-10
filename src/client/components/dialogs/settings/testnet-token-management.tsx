import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import useTestnetTokensStore, {
  TestnetToken,
} from "../../../hooks/use-testnet-tokens-store";
import useDevModeStore from "../../../hooks/use-dev-mode";
import { getTestnetTokenMetadata } from "../../../utils/testnet-rpc";
import { DialogWrapper, DialogHeader, DialogContent } from "../../ui/dialog";
import { Coins, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";

interface TestnetTokenManagementProps {
  onBack: () => void;
}

export const TestnetTokenManagement = ({
  onBack,
}: TestnetTokenManagementProps) => {
  const { isDevMode } = useDevModeStore();
  const { tokens, addToken, removeToken, clearTokens } =
    useTestnetTokensStore();

  const [newToken, setNewToken] = useState({
    address: "",
    name: "",
    symbol: "",
    decimals: "18",
    icon_url: "",
  });
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const handleFetchMetadata = async () => {
    if (!newToken.address) {
      alert("Please enter a token address first");
      return;
    }

    setIsLoadingMetadata(true);
    try {
      const metadata = await getTestnetTokenMetadata(newToken.address);
      setNewToken((prev) => ({
        ...prev,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals.toString(),
      }));
    } catch (error) {
      console.error("Failed to fetch token metadata:", error);
      alert("Failed to fetch token metadata. Please enter manually.");
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleAddToken = () => {
    if (!newToken.address || !newToken.symbol || !newToken.name) {
      alert("Please fill in required fields: address, symbol, and name");
      return;
    }

    addToken({
      address: newToken.address,
      name: newToken.name,
      symbol: newToken.symbol,
      decimals: parseInt(newToken.decimals) || 18,
      icon_url: newToken.icon_url || undefined,
    });

    // Reset form
    setNewToken({
      address: "",
      name: "",
      symbol: "",
      decimals: "18",
      icon_url: "",
    });
  };

  if (!isDevMode) {
    return (
      <DialogWrapper>
        <DialogHeader title="Testnet Token Management" onClose={onBack} />
        <DialogContent className="flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center size-16 bg-[var(--card-color)] rounded-full">
              <AlertCircle className="size-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Developer Mode Required
              </h3>
              <p className="text-sm text-white/70">
                Testnet token management is only available in developer mode.
                Enable it in Settings to access this feature.
              </p>
            </div>
          </div>
        </DialogContent>
      </DialogWrapper>
    );
  }

  return (
    <DialogWrapper>
      <DialogHeader title="Testnet Token Management" onClose={onBack} />
      <DialogContent>
        <div className="space-y-4">
          {/* Description */}
          <div className="text-sm text-white/80">
            <p>
              Add custom tokens for HyperEVM Testnet. These tokens will be
              stored locally and only visible in developer mode.
            </p>
          </div>

          {/* Add Token Form */}
          <div className="bg-[var(--card-color)] rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-[var(--primary-color)]" />
              <h4 className="font-medium text-white">Add New Token</h4>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Token Contract Address"
                  value={newToken.address}
                  onChange={(e) =>
                    setNewToken((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
                <Button
                  onClick={handleFetchMetadata}
                  disabled={!newToken.address || isLoadingMetadata}
                  variant="secondary"
                  className="px-3 min-w-[80px]"
                >
                  {isLoadingMetadata ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    "Fetch"
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="text"
                  placeholder="Token Name"
                  value={newToken.name}
                  onChange={(e) =>
                    setNewToken((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  type="text"
                  placeholder="Symbol"
                  value={newToken.symbol}
                  onChange={(e) =>
                    setNewToken((prev) => ({ ...prev, symbol: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="text"
                  placeholder="Decimals"
                  value={newToken.decimals}
                  onChange={(e) =>
                    setNewToken((prev) => ({
                      ...prev,
                      decimals: e.target.value,
                    }))
                  }
                />
                <Input
                  type="text"
                  placeholder="Icon URL (optional)"
                  value={newToken.icon_url}
                  onChange={(e) =>
                    setNewToken((prev) => ({
                      ...prev,
                      icon_url: e.target.value,
                    }))
                  }
                />
              </div>

              <Button onClick={handleAddToken} className="w-full">
                <Plus className="size-4" />
                Add Token
              </Button>
            </div>
          </div>

          {/* Token List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="size-5 text-[var(--primary-color)]" />
                <h4 className="font-medium text-white">
                  Current Tokens ({tokens.length})
                </h4>
              </div>
              {tokens.length > 1 && (
                <Button
                  variant="secondary"
                  onClick={clearTokens}
                  className="px-3 py-2 text-sm"
                >
                  <Trash2 className="size-4" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tokens.map((token: TestnetToken) => (
                <div
                  key={token.address}
                  className="bg-[var(--card-color)] rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-lg">
                          {token.symbol}
                        </span>
                        {token.isNative && (
                          <span className="text-xs bg-[var(--primary-color)]/20 text-[var(--primary-color)] px-2 py-1 rounded-full font-medium">
                            NATIVE
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/80">{token.name}</div>
                      <div className="text-xs text-white/50 font-mono break-all">
                        {token.address}
                      </div>
                      <div className="text-sm text-[var(--primary-color)] font-medium">
                        Balance: {token.balanceFormatted.toFixed(4)}{" "}
                        {token.symbol}
                      </div>
                    </div>

                    {!token.isNative && (
                      <Button
                        variant="destructive"
                        onClick={() => removeToken(token.address)}
                        className="px-3 py-2 text-sm ml-3"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {tokens.length === 0 && (
                <div className="text-center py-8 text-white/50">
                  <Coins className="size-12 mx-auto mb-3 text-white/30" />
                  <p>No tokens added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};
