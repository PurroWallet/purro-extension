import { cn } from '@/client/lib/utils';

const Header = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'bg-[var(--background-color)] border-b border-white/10 h-12 px-2 flex items-center justify-between font-livvic',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Header;
