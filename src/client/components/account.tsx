import { accountHandler } from "@/background/handlers/account-handler";
import { cn } from "@/client/lib/utils";
import { useEffect, useMemo, useState } from "react";

export const AccountIcon = ({
  icon,
  alt,
  className,
}: {
  icon?: string;
  alt: string;
  className?: string;
}) => {
  if (!icon) return null;

  // Kiểm tra xem icon có phải là URL không (bắt đầu bằng http/https hoặc data:)
  const isUrl =
    icon.startsWith("http") ||
    icon.startsWith("https") ||
    icon.startsWith("data:");

  if (isUrl) {
    return <img src={icon} alt={alt} className={cn("size-6", className)} />;
  } else {
    return (
      <span
        className={cn(
          "text-lg w-8 text-center flex items-center justify-center",
          className
        )}
      >
        {icon}
      </span>
    );
  }
};

export const AccountName = ({
  name,
  className,
  address,
}: {
  name?: string;
  className?: string;
  address?: string;
}) => {
  if (!name) return null;

  const truncatedName = name.length > 20 ? `${name.substring(0, 10)}...` : name;
  const [hlName, setHlName] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      accountHandler.getHLNameByAddress("0xF26F5551E96aE5162509B25925fFfa7F07B2D652").then((hlName) => {
        setHlName(hlName);
      });
    }
  }, [address]);

  return (
    <div className="flex flex-col items-start">
      <p
        className={cn("text-base font-medium truncate", className)}
        title={name}
      >
        {truncatedName}
      </p>
      {hlName && <p className="text-xs text-white/50">{hlName}</p>}
    </div>
  );
};
