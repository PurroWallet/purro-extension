import { ArrowDown, ArrowUp } from "lucide-react";
import TabsLoading from "../home/tabs/tabs-loading";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { truncateAddress } from "@/client/utils/formatters";
import useDialogStore from "@/client/hooks/use-dialog-store";
import HistoryDetailDialog from "./history-detail-dialog";
import { HyperScanTokenTransfersItems } from "@/client/types/hyperscan-api";
import useHyperscan from "@/client/hooks/use-hyperscan";
import { useEffect, useMemo, useState } from "react";
import { getHLNameByAddress } from "@/client/services/hyperliquid-name-api";

const History = () => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const { useTokenTransfers } = useHyperscan();
  const { isLoading, data: transactions } = useTokenTransfers("both");
  const { openDialog } = useDialogStore();
  const [hlNames, setHlNames] = useState<Record<string, string | null>[]>([]);

  const listAddresses: string[] =
    useMemo(() => {
      return transactions?.items
        .map((item) => {
          if (item.from.hash !== activeAccount?.eip155?.address) {
            return item.from.hash;
          }
          if (item.to.hash !== activeAccount?.eip155?.address) {
            return item.to.hash;
          }
          return null;
        })
        .filter((address) => address !== null)
        .filter((address, index, self) => self.indexOf(address) === index);
    }, [transactions, activeAccount]) || [];

  useEffect(() => {
    const fetchHlNames = async () => {
      if (transactions) {
        // Add the active account address to the list of addresses
        if (activeAccount?.eip155?.address) {
          listAddresses.push(activeAccount?.eip155?.address);
        }

        const hlNames = await Promise.all(
          listAddresses.map(async (address) => {
            const hlName = await getHLNameByAddress(address);

            return {
              [address]: hlName || null,
            };
          })
        );

        setHlNames(hlNames);
      }
    };

    fetchHlNames();
  }, [transactions, activeAccount]);

  // Function to format large numbers in a compact way
  const formatTokenAmount = (amount: number): string => {
    if (amount === 0) return "0";

    const absAmount = Math.abs(amount);

    // For very large numbers, use scientific notation or compact format
    if (absAmount >= 1e12) {
      return (amount / 1e12).toFixed(2) + "T";
    } else if (absAmount >= 1e9) {
      return (amount / 1e9).toFixed(2) + "B";
    } else if (absAmount >= 1e6) {
      return (amount / 1e6).toFixed(2) + "M";
    } else if (absAmount >= 1e3) {
      return (amount / 1e3).toFixed(2) + "K";
    } else if (absAmount >= 1) {
      return amount.toFixed(4);
    } else if (absAmount >= 0.0001) {
      return amount.toFixed(6);
    } else {
      // For very small numbers, use scientific notation
      return amount.toExponential(2);
    }
  };

  const handleOpenDialog = (transaction: HyperScanTokenTransfersItems) => {
    openDialog(
      <HistoryDetailDialog transaction={transaction} hlNames={hlNames} />
    );
  };

  return (
    <div className="p-2 space-y-2">
      <p className="text-lg font-bold text-center">Token Transfer History</p>

      {isLoading && (
        <div className="flex justify-center items-center">
          <TabsLoading />
        </div>
      )}
      {!isLoading && transactions && transactions.items.length === 0 && (
        <div className="flex justify-center items-center pt-8">
          <p className="text-sm text-muted-foreground">No transactions found</p>
        </div>
      )}

      {transactions &&
        transactions.items.map((item) => {
          // Convert addresses to lowercase for comparison
          const toAddress = item.to.hash?.toLowerCase();
          const fromAddress = item.from.hash?.toLowerCase();
          const userAddress = activeAccount?.eip155?.address?.toLowerCase();

          const isReceive = toAddress === userAddress;
          const isSend = fromAddress === userAddress;
          const isTokenMinting = item.type.includes("token_minting");
          const isTokenBurning = item.type.includes("token_burning");
          const isTokenTransfer = item.type.includes("token_transfer");

          return (
            <div
              key={item.transaction_hash}
              className="flex items-center gap-2 p-3 rounded-lg bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer"
              onClick={() => handleOpenDialog(item)}
            >
              <div className="flex items-center justify-center size-12 rounded-full bg-[var(--primary-color)]/10 relative">
                {item.token.icon_url && (
                  <img
                    src={item.token.icon_url || ""}
                    alt="logo"
                    className="size-full rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallbackDiv = document.createElement("div");
                        fallbackDiv.className =
                          "size-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-lg border border-[var(--primary-color)]/20";
                        fallbackDiv.textContent =
                          item.token.symbol?.charAt(0).toUpperCase() || "";
                        parent.insertBefore(fallbackDiv, e.currentTarget);
                      }
                    }}
                  />
                )}
                {!item.token.icon_url && (
                  <div className="size-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-lg border border-[var(--primary-color)]/20">
                    {item.token.symbol?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                {isSend && (
                  <div className="absolute top-0 right-0 size-4 bg-red-500 rounded-full flex items-center justify-center font-bold text-red-200 text-lg border border-red-500/20">
                    <ArrowUp className="size-4 text-red-200" strokeWidth={3} />
                  </div>
                )}
                {isReceive && (
                  <div className="absolute top-0 right-0 size-4 bg-green-500 rounded-full flex items-center justify-center font-bold text-green-200 text-lg border border-green-200/20">
                    <ArrowDown
                      className="size-4 text-green-200"
                      strokeWidth={3}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <p className="text-base font-bold">
                  {isSend &&
                  !isTokenMinting &&
                  !isTokenBurning &&
                  !isTokenTransfer
                    ? "Sent"
                    : isReceive &&
                      !isTokenMinting &&
                      !isTokenBurning &&
                      !isTokenTransfer
                    ? "Received"
                    : isTokenMinting
                    ? "Minted"
                    : isTokenBurning
                    ? "Burned"
                    : "Transferred"}
                  {item.token.type === "ERC-20" && " Token"}
                  {item.token.type === "ERC-721" && " NFT"}
                  {item.token.type === "ERC-1155" && " NFT"}
                  {item.token.type === "ERC-404" && " Token"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(item.token.type === "ERC-20"
                    ? item.token.symbol || item.token.name || "Unnamed token"
                    : item.token.name || "Unnamed NFT"
                  ).length > 10
                    ? `${(item.token.type === "ERC-20"
                        ? item.token.symbol ||
                          item.token.name ||
                          "Unnamed token"
                        : item.token.name || "Unnamed NFT"
                      ).substring(0, 10)}...`
                    : item.token.type === "ERC-20"
                    ? item.token.symbol || item.token.name || "Unnamed token"
                    : item.token.name || "Unnamed NFT"}
                </p>
              </div>

              <div className="flex flex-col items-end ml-auto">
                <p className="text-sm font-bold">
                  {isSend ? "-" : "+"}
                  {/* Display amount - you may need to format this based on token decimals */}
                  {formatTokenAmount(
                    Number(item.total?.value || "0") /
                      10 ** Number(item.total?.decimals || "0")
                  )}{" "}
                  {item.token.symbol && item.token.symbol.length > 6
                    ? `${item.token.symbol.substring(0, 6)}...`
                    : item.token.symbol || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSend ? "To" : "From"}
                  {isReceive &&
                    ` ${
                      hlNames.find((hlName) => hlName[item.from.hash])?.[
                        item.from.hash
                      ] || truncateAddress(item.from.hash)
                    }`}
                  {isSend &&
                    ` ${
                      hlNames.find((hlName) => hlName[item.to.hash])?.[
                        item.to.hash
                      ] || truncateAddress(item.to.hash)
                    }`}
                </p>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default History;
