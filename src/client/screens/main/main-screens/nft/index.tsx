import { useState, useEffect } from 'react';
import { NFTImage } from '@/client/components/nft-image';
import TabsLoading from '../home/tabs/tabs-loading';
import placeholderNft from '@/assets/placeholder-nft.png';
import NftInstancesDialog from './nft-instances-dialog';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { Pagination } from '@/client/components/ui';
import { HyperScanNftCollectionsNextPageParams } from '@/client/types/hyperscan-api';
import useNFTsWithCache from '@/client/hooks/use-nfts-with-cache';

const WalletNFTs = () => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageParams, setPageParams] = useState<
    Record<number, HyperScanNftCollectionsNextPageParams | undefined>
  >({
    1: undefined, // First page has no params
  });
  const { data: nfts, isLoading: isLoadingNfts } = useNFTsWithCache(
    currentPage,
    pageParams[currentPage]
  );
  const { openDialog } = useDialogStore();

  // Reset pagination when account changes
  useEffect(() => {
    setCurrentPage(1);
    setPageParams({
      1: undefined,
    });
  }, [activeAccount?.eip155?.address]);

  // Store next page parameters when data changes
  useEffect(() => {
    if (nfts?.next_page_params) {
      setPageParams(prev => ({
        ...prev,
        [currentPage + 1]: nfts.next_page_params,
      }));
    }
  }, [nfts, currentPage]);

  // Handle page navigation
  const goToNextPage = () => {
    if (nfts?.next_page_params) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (isLoadingNfts) {
    return <TabsLoading />;
  }

  if (!nfts?.items?.length) {
    return (
      <div className="flex justify-center items-center pt-8">
        <p className="text-sm text-muted-foreground">No NFTs found</p>
      </div>
    );
  }

  // Debug info (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('NFT data:', {
      totalItems: nfts.items.length,
      sampleItem: nfts.items[0],
      sampleImageUrl: nfts.items[0]?.token_instances[0]?.image_url,
    });
  }

  const handleOpenNftInstancesDialog = (nft: any) => {
    openDialog(
      <NftInstancesDialog
        tokenAddress={nft.token.address}
        tokenName={nft.token.name}
        tokenSymbol={nft.token.symbol}
        tokenType={nft.token.type}
      />
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-2">
        {nfts?.items?.map((item, index) => (
          <div
            key={`nft-${item.token.address}`}
            className="aspect-square rounded-lg overflow-hidden bg-card hover:scale-105 transition-transform cursor-pointer border-[var(--primary-color-light)]/20 border"
            onClick={() => handleOpenNftInstancesDialog(item)}
          >
            {item.token_instances.length > 0 ? (
              <div className="relative size-full">
                <NFTImage
                  imageUrl={item.token_instances[0]?.image_url}
                  alt={item.token.name || `NFT #${index}`}
                  className="size-full object-contain"
                  tokenName={item.token.name}
                  onError={(error: Error) => {
                    console.error('NFT image failed to load:', {
                      tokenName: item.token.name,
                      imageUrl: item.token_instances[0]?.image_url,
                      error: error.message,
                    });
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 text-white text-left my-1 mx-2 flex items-center justify-between gap-1 w-full bg-black/50 rounded-lg">
                  <p className="rounded-lg text-base bg-primary/90 px-2 truncate flex-1">
                    {item.token.name}
                  </p>

                  <p className="text-sm font-normal bg-primary/90 px-2 mx-3 rounded-full z-10">
                    {item.amount}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground relative px-2 text-center">
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={placeholderNft}
                    alt="NFT Placeholder"
                    className="size-16 mb-2 opacity-50"
                  />
                  <span className="text-xs text-center">{item.token.name}</span>
                </div>
                <div className="absolute bottom-0 right-0 text-white text-left my-1 mx-2 flex items-center justify-right gap-1">
                  {item.token.type === 'ERC-1155' && (
                    <p className="text-sm font-normal bg-primary/90 px-2 rounded-full">
                      {item.amount}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {nfts.next_page_params && nfts.items.length > 0 && (
        <div className="flex justify-center items-center p-2">
          <Pagination
            currentPage={currentPage}
            goToNextPage={goToNextPage}
            goToPrevPage={goToPrevPage}
            disabled={!nfts?.next_page_params}
          />
        </div>
      )}
    </>
  );
};

export default WalletNFTs;
