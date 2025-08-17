import { Network } from 'lucide-react';

interface EmptyStateProps {
  isLoading: boolean;
  hasTransactions: boolean;
}

export const EmptyState = ({ isLoading, hasTransactions }: EmptyStateProps) => {
  if (isLoading || hasTransactions) {
    return null; // Don't show empty state while loading or when there are transactions
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--card-color)] flex items-center justify-center mb-4">
        <Network className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">No transactions found</p>
      <p className="text-sm text-muted-foreground mt-1">
        Try adjusting your filters or check back later
      </p>
    </div>
  );
};
