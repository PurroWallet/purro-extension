import { useState, useEffect } from 'react';
import { getTokenLogo } from '@/client/utils/icons';
import { ChainType } from '@/client/types/wallet';

export const useTokenLogo = (
  symbol?: string,
  networkId?: ChainType,
  tokenAddress?: string
) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setLogoSrc(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const fetchLogo = async () => {
      try {
        const logo = await getTokenLogo(symbol, networkId, tokenAddress);
        if (!isCancelled) {
          setLogoSrc(logo);
        }
      } catch (error) {
        console.error('Error fetching token logo:', error);
        if (!isCancelled) {
          setLogoSrc(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchLogo();

    return () => {
      isCancelled = true;
    };
  }, [symbol, networkId, tokenAddress]);

  return { logoSrc, isLoading };
};

export default useTokenLogo;
