import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import { Button } from '@/client/components/ui';
import { HyperScanTokenTransfersItems } from '@/client/types/hyperscan-api';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { ArrowUp } from 'lucide-react';
import { ArrowDown } from 'lucide-react';
import { truncateAddress } from '@/client/utils/formatters';

const HistoryDetailDialog = ({
  transaction,
  hlNames,
}: {
  transaction: HyperScanTokenTransfersItems;
  hlNames: Record<string, string | null>[];
}) => {
  const { closeDialog } = useDialogStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const toAddress = transaction.to.hash?.toLowerCase();
  const fromAddress = transaction.from.hash?.toLowerCase();
  const userAddress = activeAccount?.eip155?.address?.toLowerCase();

  const isReceive = toAddress === userAddress;
  const isSend = fromAddress === userAddress;
  const isTokenMinting = transaction.type.includes('token_minting');
  const isTokenBurning = transaction.type.includes('token_burning');
  const isTokenTransfer = transaction.type.includes('token_transfer');

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
            {transaction.token.type === 'ERC-20' && ' Token'}
            {transaction.token.type === 'ERC-721' && ' NFT'}
            {transaction.token.type === 'ERC-1155' && ' NFT'}
            {transaction.token.type === 'ERC-404' && ' Token'}
          </h2>
          <div className="flex items-center justify-center size-24 rounded-full bg-[var(--primary-color)]/10 relative">
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
                    ? truncateAddress(transaction.to.hash)
                    : truncateAddress(transaction.from.hash)}
                </p>
                <p className="text-xs text-muted-foreground text-right truncate w-full">
                  {
                    hlNames.find(hlName =>
                      isSend
                        ? hlName[transaction.to.hash]
                        : hlName[transaction.from.hash]
                    )?.[isSend ? transaction.to.hash : transaction.from.hash]
                  }
                </p>
              </div>
            </div>
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Amount</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {formatTokenAmount(
                  Number(transaction.total?.value || '0') /
                    10 ** Number(transaction.total?.decimals || '0')
                )}{' '}
                {transaction.token.symbol && transaction.token.symbol.length > 6
                  ? `${transaction.token.symbol.substring(0, 6)}...`
                  : transaction.token.symbol || 'Unknown'}
              </p>
            </div>
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Network</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                HyperEVM
              </p>
            </div>
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold flex-1 whitespace-nowrap">
                Transaction Hash
              </p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {truncateAddress(transaction.transaction_hash)}
              </p>
            </div>
            <div className="w-full flex items-center justify-center bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer p-3 gap-2">
              <a
                className="text-base text-center font-semibold text-[var(--primary-color-light)]"
                href={`https://hyperscan.com/tx/${transaction.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on HyperScan
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
