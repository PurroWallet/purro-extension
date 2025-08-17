import { cn } from '@/client/lib/utils';
import { useEffect, useState } from 'react';
import { getHLNameByAddress } from '@/client/services/hyperliquid-name-api';

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
    icon.startsWith('http') ||
    icon.startsWith('https') ||
    icon.startsWith('data:');

  if (isUrl) {
    return (
      <img
        src={icon}
        alt={alt}
        className={cn('size-6 rounded-full', className)}
      />
    );
  } else {
    return (
      <span
        className={cn(
          'text-lg w-8 text-center flex items-center justify-center rounded-full',
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
  const [hlName, setHlName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!address);

  useEffect(() => {
    let isMounted = true;
    if (address) {
      setLoading(true);
      getHLNameByAddress(address)
        .then(hlName => {
          if (isMounted) setHlName(hlName);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setHlName(null);
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [address]);

  // Early return after hooks
  if (!name) return null;

  const truncatedName = name.length > 20 ? `${name.substring(0, 10)}...` : name;
  // Nếu có hlName thì thay thế tên wallet
  const displayName = hlName || truncatedName;

  return (
    <div className="flex flex-col items-start">
      {loading ? (
        <div
          className={cn(
            'h-6 w-24 bg-white/10 rounded-full animate-pulse',
            className
          )}
        />
      ) : (
        <p
          className={cn('text-base font-medium truncate', className)}
          title={hlName ? hlName : name}
        >
          {displayName}
        </p>
      )}
    </div>
  );
};
