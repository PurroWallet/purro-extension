import React from 'react';
import { cn } from '@/client/lib/utils';

const MainContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('flex-1 overflow-y-auto pb-16', className)}>{children}</div>
  );
};

export default MainContent;
