import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import { Button } from '@/client/components/ui';
import { HyperScanTokenTransfersItems } from '@/client/types/hyperscan-api';
import { EtherscanTransaction } from '@/client/types/etherscan-api';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { ArrowUp, ArrowDown, Network } from 'lucide-react';
import { truncateAddress } from '@/client/utils/formatters';
import { NETWORK_ICONS } from '@/utils/network-icons';

// Extended transaction type for the history screen
interface TransactionWithChain extends EtherscanTransaction {
  chainId: number;
  chainName: string;
  type: 'send' | 'receive';
}

// Union type for both transaction types
type TransactionType = HyperScanTokenTransfersItems | TransactionWithChain;

// Type guard functions
const isHyperScanTransaction = (tx: TransactionType): tx is HyperScanTokenTransfersItems => {
  return 'token' in tx && 'total' in tx;
};

const isEtherscanTransaction = (tx: TransactionType): tx is TransactionWithChain => {
  return 'chainId' in tx && 'chainName' in tx;
};

const HistoryDetailDialog = ({
  transaction,
  hlNames = [],
}: {
  transaction: TransactionType;
  hlNames?: Record<string, string | null>[];
}) => {
  const { closeDialog } = useDialogStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const userAddress = activeAccount?.eip155?.address?.toLowerCase();

  // Extract addresses based on transaction type
  const toAddress = isHyperScanTransaction(transaction)
    ? transaction.to.hash?.toLowerCase()
    : transaction.to?.toLowerCase();
  const fromAddress = isHyperScanTransaction(transaction)
    ? transaction.from.hash?.toLowerCase()
    : transaction.from?.toLowerCase();

  // Determine transaction direction
  const isReceive = isHyperScanTransaction(transaction)
    ? toAddress === userAddress
    : transaction.type === 'receive';
  const isSend = isHyperScanTransaction(transaction)
    ? fromAddress === userAddress
    : transaction.type === 'send';

  // Token-specific flags (only for HyperScan transactions)
  const isTokenMinting = isHyperScanTransaction(transaction) && transaction.type.includes('token_minting');
  const isTokenBurning = isHyperScanTransaction(transaction) && transaction.type.includes('token_burning');
  const isTokenTransfer = isHyperScanTransaction(transaction) && transaction.type.includes('token_transfer');

  const formatTokenAmount = (amount: number): string => {
    const absAmount = Math.abs(amount);

    // For very large numbers, use scientific notation or compact format
    if (absAmount >= 1e12) {
      return (amount / 1e12).toFixed(2) + 'T';
    } else if (absAmount >= 1e9) {
      return (amount / 1e9).toFixed(2) + 'B';
    } else if (absAmount >= 1e6) {
      return (amount / 1e6).toFixed(2) + 'M';
    } else if (absAmount >= 1e3) {
      return (amount / 1e3).toFixed(2) + 'K';
    } else if (absAmount >= 1) {
      return amount.toFixed(4);
    } else if (absAmount >= 0.0001) {
      return amount.toFixed(6);
    } else {
      // For very small numbers, use scientific notation
      return amount.toExponential(2);
    }
  };

  const formatEthAmount = (weiValue: string): string => {
    const ethValue = parseFloat(weiValue) / 1e18;
    if (ethValue === 0) return '0';
    if (ethValue < 0.0001) return ethValue.toExponential(2);
    if (ethValue < 1) return ethValue.toFixed(6);
    return ethValue.toFixed(4);
  };

  // Get chain icon helper
  const getChainIcon = (chainName: string) => {
    const iconMap: Record<string, string> = {
      ethereum: NETWORK_ICONS.ethereum,
      arbitrum: NETWORK_ICONS.arbitrum,
      base: NETWORK_ICONS.base,
      hyperevm: NETWORK_ICONS.hyperevm,
    };
    return iconMap[chainName.toLowerCase()] || null;
  };

  // Get explorer URL helper
  const getExplorerUrl = (tx: TransactionType): string => {
    if (isHyperScanTransaction(tx)) {
      return `https://hyperscan.com/tx/${tx.transaction_hash}`;
    }

    const explorerMap: Record<string, string> = {
      ethereum: 'https://etherscan.io',
      arbitrum: 'https://arbiscan.io',
      base: 'https://basescan.org',
      hyperevm: 'https://hyperscan.com',
    };

    const baseUrl = explorerMap[tx.chainName.toLowerCase()] || 'https://etherscan.io';
    return `${baseUrl}/tx/${tx.hash}`;
  };

  // Get explorer name helper
  const getExplorerName = (tx: TransactionType): string => {
    if (isHyperScanTransaction(tx)) {
      return 'View on HyperScan';
    }

    const explorerNames: Record<string, string> = {
      ethereum: 'View on Etherscan',
      arbitrum: 'View on Arbiscan',
      base: 'View on BaseScan',
      hyperevm: 'View on HyperScan',
    };

    return explorerNames[tx.chainName.toLowerCase()] || 'View on Explorer';
  };

  return (
    <DialogWrapper>
      <DialogHeader title="Transaction Details" onClose={() => closeDialog()} />
      <DialogContent>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-bold">
            {isSend && !isTokenMinting && !isTokenBurning && !isTokenTransfer
              ? 'Sent'
              : isReceive &&
                  !isTokenMinting &&
                  !isTokenBurning &&
                  !isTokenTransfer
                ? 'Received'
                : isTokenMinting
                  ? 'Minted'
                  : isTokenBurning
                    ? 'Burned'
                    : 'Transferred'}
            {isHyperScanTransaction(transaction) && (
              <>
                {transaction.token.type === 'ERC-20' && ' Token'}
                {transaction.token.type === 'ERC-721' && ' NFT'}
                {transaction.token.type === 'ERC-1155' && ' NFT'}
                {transaction.token.type === 'ERC-404' && ' Token'}
              </>
            )}
            {isEtherscanTransaction(transaction) && ' ETH'}
          </h2>
          <div className="flex items-center justify-center size-24 rounded-full bg-[var(--primary-color)]/10 relative">
            {isHyperScanTransaction(transaction) ? (
              <>
                {transaction.token.icon_url && (
                  <img
                    src={transaction.token.icon_url || ''}
                    alt="logo"
                    className="size-full rounded-full"
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallbackDiv = document.createElement('div');
                        fallbackDiv.className =
                          'size-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-2xl border border-[var(--primary-color)]/20';
                        fallbackDiv.textContent =
                          transaction.token.symbol?.charAt(0).toUpperCase() || '';
                        parent.insertBefore(fallbackDiv, e.currentTarget);
                      }
                    }}
                  />
                )}
                {!transaction.token.icon_url && (
                  <div className="size-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/10 rounded-full flex items-center justify-center font-bold text-[var(--primary-color)] text-2xl border border-[var(--primary-color)]/20">
                    {transaction.token.symbol?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </>
            ) : (
              // For Etherscan transactions, show chain icon
              <>
                {getChainIcon(transaction.chainName) ? (
                  <img
                    src={getChainIcon(transaction.chainName)!}
                    alt={transaction.chainName}
                    className="size-12 rounded-full"
                  />
                ) : (
                  <Network className="size-12 text-[var(--primary-color)]" />
                )}
              </>
            )}
            {isSend && (
              <div className="absolute top-0 right-0 size-8 bg-red-500 rounded-full flex items-center justify-center font-bold text-red-200 text-lg border border-red-500/20">
                <ArrowUp className="size-4 text-red-200" strokeWidth={3} />
              </div>
            )}
            {isReceive && (
              <div className="absolute top-0 right-0 size-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-green-200 text-lg border border-green-200/20">
                <ArrowDown className="size-4 text-green-200" strokeWidth={3} />
              </div>
            )}
          </div>
          <div className="rounded-lg overflow-hidden w-full">
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">
                {isSend ? 'To' : 'From'}
              </p>
              <div className="flex flex-col items-end">
                <p className="text-sm text-muted-foreground text-right truncate w-full">
                  {isSend
                    ? truncateAddress(toAddress || '')
                    : truncateAddress(fromAddress || '')}
                </p>
                {isHyperScanTransaction(transaction) && (
                  <p className="text-xs text-muted-foreground text-right truncate w-full">
                    {
                      hlNames.find(hlName =>
                        isSend
                          ? hlName[transaction.to.hash]
                          : hlName[transaction.from.hash]
                      )?.[isSend ? transaction.to.hash : transaction.from.hash]
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Amount</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {isHyperScanTransaction(transaction) ? (
                  <>
                    {formatTokenAmount(
                      Number(transaction.total?.value || '0') /
                        10 ** Number(transaction.total?.decimals || '0')
                    )}{' '}
                    {transaction.token.symbol && transaction.token.symbol.length > 6
                      ? `${transaction.token.symbol.substring(0, 6)}...`
                      : transaction.token.symbol || 'Unknown'}
                  </>
                ) : (
                  `${formatEthAmount(transaction.value)} ETH`
                )}
              </p>
            </div>
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Network</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {isHyperScanTransaction(transaction) ? 'HyperEVM' : transaction.chainName}
              </p>
            </div>
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold flex-1 whitespace-nowrap">
                Transaction Hash
              </p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {truncateAddress(
                  isHyperScanTransaction(transaction)
                    ? transaction.transaction_hash
                    : transaction.hash
                )}
              </p>
            </div>
            {isEtherscanTransaction(transaction) && (
              <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
                <p className="text-base text-left font-semibold">Block Number</p>
                <p className="text-sm text-muted-foreground text-right truncate w-full">
                  {transaction.blockNumber}
                </p>
              </div>
            )}
            {isEtherscanTransaction(transaction) && (
              <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
                <p className="text-base text-left font-semibold">Date</p>
                <p className="text-sm text-muted-foreground text-right truncate w-full">
                  {new Date(parseInt(transaction.timeStamp) * 1000).toLocaleString()}
                </p>
              </div>
            )}
            <div className="w-full flex items-center justify-center bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer p-3 gap-2">
              <a
                className="text-base text-center font-semibold text-[var(--primary-color-light)]"
                href={getExplorerUrl(transaction)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {getExplorerName(transaction)}
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button className="w-full" onClick={() => closeDialog()}>
          Close
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default HistoryDetailDialog;
