import InfiniteScroll from 'react-infinite-scroll-component';
import TabsLoading from '../home/tabs/tabs-loading';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import HistoryDetailDialog from './history-detail-dialog';
import type { TransactionWithChain } from './types';
import { useTransactionProcessing } from './hooks/use-transaction-processing';
import { useTransactionGrouping } from './hooks/use-transaction-grouping';
import { TransactionGroup } from './components/transaction-group';
import { EmptyState } from './components/empty-state';
import useHistoryChainFilterStore from '@/client/hooks/use-history-chain-filter';

const History = () => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const { openDialog } = useDialogStore();
  const activeAccount = getActiveAccountWalletObject();
  const address = activeAccount?.eip155?.address;

  // Use global chain filter store
  const { chainFilter } = useHistoryChainFilterStore();

  // Use custom hooks for transaction processing and grouping
  const {
    processedTransactions,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error,
  } = useTransactionProcessing(address, chainFilter);

  const groupedTransactions = useTransactionGrouping(processedTransactions);

  // Handle transaction click
  const handleTransactionClick = (transaction: TransactionWithChain) => {
    openDialog(<HistoryDetailDialog transaction={transaction} />);
  };

  if (isLoading && processedTransactions.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <TabsLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400">
          Error loading transactions: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-4">
      {/* Empty State */}
      <EmptyState
        isLoading={isLoading}
        hasTransactions={processedTransactions.length > 0}
      />

      {/* Transaction List - Only show when there are transactions */}
      {processedTransactions.length > 0 && (
        <InfiniteScroll
          dataLength={processedTransactions.length}
          next={fetchNextPage}
          hasMore={!!hasNextPage}
          loader={
            <div className="flex justify-center py-4">
              <TabsLoading />
            </div>
          }
          endMessage={
            <p className="text-center text-sm text-muted-foreground py-4">
              <b>You&apos;ve seen all transactions</b>
            </p>
          }
          className="space-y-4"
        >
          {groupedTransactions.map(group => (
            <TransactionGroup
              key={group.date}
              group={group}
              onTransactionClick={handleTransactionClick}
            />
          ))}
        </InfiniteScroll>
      )}
    </div>
  );
};

export default History;
