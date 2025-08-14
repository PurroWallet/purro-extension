import { cn } from '@/client/lib/utils';

const LoadingDisplay = ({
  className = 'text-[var(--primary-color-light)]',
}: {
  className?: string;
}) => {
  return (
    <div className="flex flex-col bg-[var(--background-color)] items-center justify-center size-full absolute inset-0 z-[50]">
      <div className="flex-1 size-full flex flex-col items-center justify-center gap-2">
        <div
          className={cn(
            'animate-spin rounded-full size-10 border-b-2 border-[var(--primary-color-light)]',
            className
          )}
        ></div>
      </div>
    </div>
  );
};

export default LoadingDisplay;
