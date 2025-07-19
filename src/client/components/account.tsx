import { cn } from "@/client/lib/utils";

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
}: {
  name?: string;
  className?: string;
}) => {
  if (!name) return null;

  const truncatedName = name.length > 20 ? `${name.substring(0, 10)}...` : name;

  return (
    <p className={cn("text-base font-medium truncate", className)} title={name}>
      {truncatedName}
    </p>
  );
};
