import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  disabled: boolean;
}

export const Pagination = ({
  currentPage,
  goToNextPage,
  goToPrevPage,
  disabled,
}: PaginationProps) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToPrevPage}
        disabled={currentPage <= 1}
        className="px-3 py-1 bg-primary/10 text-primary/80 rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft />
      </button>

      <div className="flex items-center justify-center text-primary/90 font-medium text-base w-8">
        <span>{currentPage}</span>
      </div>

      <button
        onClick={goToNextPage}
        disabled={disabled}
        className="px-3 py-1 bg-primary/10 text-primary/80 rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight />
      </button>
    </div>
  );
};
