import { cn } from "@/client/lib/utils";
import { ChevronRightIcon } from "lucide-react";

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
                "flex items-center gap-3 pl-4 w-full hover:bg-white/10 transition-colors duration-200 cursor-pointer",
                index !== items.length - 1 && "border-b border-white/10",
                item.itemClassName
              )}
              onClick={item.onClick}
            >
              {item.icon && <item.icon className="size-5" />}
              <div className={`flex-grow flex items-center gap-3 py-4 pr-4`}>
                <p className="text-base font-medium w-full text-left">
                  {item.label}
                </p>
                {item.description && (
                  <div className="flex items-center gap-2 w-full">
                    <p className="text-base text-gray-400 w-full text-right truncate">
                      {item.description}
                    </p>
                  </div>
                )}
                {item.arrowLeft && <ChevronRightIcon className="size-5" />}
                {item.arrowLeftIcon && (
                  <item.arrowLeftIcon className="size-5" />
                )}
              </div>
            </button>
          )
      )}
    </div>
  );
};
