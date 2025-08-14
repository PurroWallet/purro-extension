import React from 'react';
import { cn } from '@/client/lib/utils';
import { ChevronRightIcon } from 'lucide-react';

interface MenuProps {
  items: {
    isHidden?: boolean;
    icon?: React.ElementType;
    label: string;
    description?: string;
    isLongDescription?: boolean;
    onClick?: () => void;
    arrowLeft?: boolean;
    arrowLeftIcon?: React.ElementType;
    itemClassName?: string;
  }[];
}

export const Menu = ({ items }: MenuProps) => {
  return (
    <div className="bg-[var(--card-color)] rounded-lg w-full overflow-hidden">
      {items.map(
        (item, index) =>
          !item.isHidden && (
            <button
              key={`${item.label}-${index}`}
              className={cn(
                'flex items-center gap-3 pl-4 w-full hover:bg-white/10 transition-colors duration-200 cursor-pointer',
                index !== items.length - 1 && 'border-b border-white/10',
                item.itemClassName
              )}
              onClick={item.onClick}
            >
              {item.icon && <item.icon className="size-5" />}
              <div
                className={cn(
                  'flex items-center justify-between gap-3 py-4 pr-4 w-full',
                  item.isLongDescription && 'flex-col items-start'
                )}
              >
                <p className="text-base font-medium text-left">{item.label}</p>
                <div
                  className={cn(
                    'flex items-center gap-2',
                    item.isLongDescription && 'items-start'
                  )}
                >
                  {item.description && (
                    <p
                      className={cn(
                        'flex-1 text-base text-gray-400 text-right max-w-[150px]',
                        item.isLongDescription
                          ? 'text-left max-w-full w-full break-all'
                          : 'truncate'
                      )}
                    >
                      {item.description}
                    </p>
                  )}
                  {item.arrowLeft && (
                    <ChevronRightIcon className="size-5 flex-shrink-0" />
                  )}
                  {item.arrowLeftIcon && (
                    <item.arrowLeftIcon className="size-5 flex-shrink-0" />
                  )}
                </div>
              </div>
            </button>
          )
      )}
    </div>
  );
};
