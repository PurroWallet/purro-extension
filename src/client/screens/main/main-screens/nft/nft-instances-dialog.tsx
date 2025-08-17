import { ArrowLeft, Image } from 'lucide-react';
import {
  HyperScanNftInstancesItem,
  HyperScanNftInstancesNextPageParams,
} from '@/client/types/hyperscan-api';
import NftInstancesIdDialog from './nft-instances-id-dialog';
import { useState, useEffect } from 'react';
import TravelExplore from '@/assets/icon-component/travel-explore';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
  Pagination,
} from '@/client/components/ui';
import { NFTImage } from '@/client/components/nft-image';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useNFTInstancesWithCache from '@/client/hooks/use-nft-instances-with-cache';

interface NftInstancesDialogProps {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenType: string;
}

const NftInstancesDialog = ({
  tokenAddress,
  tokenName,
}: NftInstancesDialogProps) => {
  const { closeDialog } = useDialogStore();
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccount = getActiveAccountWalletObject();
  const [screen, setScreen] = useState<'list' | 'detail'>('list');
  const [selectedInstance, setSelectedInstance] =
    useState<HyperScanNftInstancesItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageParams, setPageParams] = useState<
    Record<number, HyperScanNftInstancesNextPageParams | undefined>
  >({
    1: undefined, // First page has no params
  });

  // Fetch NFT instances for this specific token with cache and pagination
  const {
    data: nftInstances,
    isLoading,
    error,
  } = useNFTInstancesWithCache(
    tokenAddress,
    currentPage,
    pageParams[currentPage],
    true
  );

  // Reset pagination when account changes
  useEffect(() => {
    setCurrentPage(1);
    setPageParams({
      1: undefined,
    });
  }, [activeAccount?.eip155?.address]);

  // Store next page parameters when data changes
  useEffect(() => {
    if (nftInstances?.next_page_params) {
      setPageParams(prev => ({
        ...prev,
        [currentPage + 1]: nftInstances.next_page_params || undefined,
      }));
    }
  }, [nftInstances, currentPage]);

  // Handle page navigation
  const goToNextPage = () => {
    if (nftInstances?.next_page_params) {
      setCurrentPage(prev => {
        const nextPage = prev + 1;
        return nextPage;
      });
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => {
        const prevPage = prev - 1;
        return prevPage;
      });
    }
  };

  const openNftInstanceDialog = (nftInstance: HyperScanNftInstancesItem) => {
    setSelectedInstance(nftInstance);
    setScreen('detail');
  };

  const goBackToList = () => {
    setScreen('list');
    setSelectedInstance(null);
  };

  // Render detail screen
  if (screen === 'detail' && selectedInstance) {
    return (
      <NftInstancesIdDialog
        nftInstance={selectedInstance}
        onBack={goBackToList}
      />
    );
  }

  // Render list screen
  return (
    <DialogWrapper>
      <DialogHeader
        title={`${tokenName}`}
        onClose={closeDialog}
        icon={<ArrowLeft className="size-4 text-white" />}
        rightContent={
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-all duration-300 cursor-pointer"
            onClick={() => {
              window.open(
                `https://www.hyperscan.com/token/${tokenAddress}`,
                '_blank'
              );
            }}
          >
            <TravelExplore className="size-5 text-white" />
          </button>
        }
      />
      <DialogContent>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">
              Failed to load NFT instances
            </div>
            <div className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : 'Unknown error occurred'}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && nftInstances?.items.length === 0 && (
          <div className="text-center py-8">
            <Image className="size-12 mx-auto mb-4 text-muted-foreground" />
            <div className="text-muted-foreground">No NFT instances found</div>
          </div>
        )}

        {/* NFT Instances Grid */}
        {!isLoading &&
          !error &&
          nftInstances?.items.length &&
          nftInstances?.items.length > 0 && (
            <>
              {/* Debug info (only in development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-gray-800 rounded text-xs text-gray-300">
                  <p>Page: {currentPage}</p>
                  <p>Items: {nftInstances.items.length}</p>
                  <p>Has Next: {!!nftInstances.next_page_params}</p>
                  <p>Can Go Back: {currentPage > 1}</p>
                  <p>Page Params Keys: {Object.keys(pageParams).join(', ')}</p>
                  {nftInstances.next_page_params && (
                    <p>
                      Next Page Params:{' '}
                      {JSON.stringify(nftInstances.next_page_params)}
                    </p>
                  )}
                  {pageParams[currentPage] && (
                    <p>
                      Current Page Params:{' '}
                      {JSON.stringify(pageParams[currentPage])}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {nftInstances?.items.map((instance: any) => (
                  <div
                    key={instance.id}
                    className="aspect-square rounded-lg overflow-hidden bg-card hover:scale-105 transition-transform cursor-pointer border border-white/10 hover:border-primary/50"
                    onClick={() => openNftInstanceDialog(instance)}
                  >
                    <div className="relative size-full">
                      <NFTImage
                        imageUrl={instance.image_url}
                        alt={
                          instance.metadata?.name ||
                          `${tokenName} #${instance.id}`
                        }
                        className="size-full object-contain"
                        tokenName={tokenName}
                        tokenId={instance.id}
                        onError={(error: Error) => {
                          console.error('NFT instance image failed to load:', {
                            tokenName,
                            instanceId: instance.id,
                            imageUrl: instance.image_url,
                            error: error.message,
                          });
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white p-2">
                        <p className="text-xs font-medium truncate">
                          #{instance.id}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {(nftInstances.next_page_params || currentPage > 1) &&
                nftInstances.items.length > 0 && (
                  <div className="flex flex-col items-center">
                    <Pagination
                      currentPage={currentPage}
                      goToNextPage={goToNextPage}
                      goToPrevPage={goToPrevPage}
                      disabled={!nftInstances?.next_page_params}
                    />
                  </div>
                )}
            </>
          )}
      </DialogContent>
    </DialogWrapper>
  );
};

export default NftInstancesDialog;
