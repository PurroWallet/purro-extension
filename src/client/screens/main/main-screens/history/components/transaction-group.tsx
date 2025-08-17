import type { GroupedTransactions, TransactionWithChain } from '../types';
import { TransactionItem } from './transaction-item';

interface TransactionGroupProps {
  group: GroupedTransactions;
  onTransactionClick: (transaction: TransactionWithChain) => void;
}

export const TransactionGroup = ({
  group,
  onTransactionClick,
}: TransactionGroupProps) => {
  return (
    <div>
      {/* Date Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm py-2 px-1 z-10">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {group.date}
        </h3>
      </div>

      {/* Transactions for this date */}
      {group.transactions.map((transaction, index) => (
        <TransactionItem
          key={`${transaction.hash}-${index}`}
          transaction={transaction}
          onTransactionClick={onTransactionClick}
        />
      ))}
    </div>
  );
};
