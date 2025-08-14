import TravelExplore from '@/assets/icon-component/travel-explore';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import { NFTImage } from '@/client/components/nft-image';
import { HyperScanNftInstancesItem } from '@/client/types/hyperscan-api';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getHLNameByAddress } from '@/client/services/hyperliquid-name-api';
import useWalletStore from '@/client/hooks/use-wallet-store';

const NftInstancesIdDialog = ({
  nftInstance,
  onBack,
}: {
  nftInstance: HyperScanNftInstancesItem;
  onBack: () => void;
}) => {
  const { getActiveAccountWalletObject } = useWalletStore();
  const activeAccountWallet = getActiveAccountWalletObject();

  const isHlName =
    nftInstance.token.address === '0x1d9d87eBc14e71490bB87f1C39F65BDB979f3cb7';

  const [hlName, setHlName] = useState<string | null>(null);
  const [hlNameLoading, setHlNameLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchHLName = async () => {
      if (activeAccountWallet) {
        setHlNameLoading(true);
        try {
          const hlName = await getHLNameByAddress(
            activeAccountWallet.eip155?.address || ''
          );
          setHlName(hlName);
          console.log(hlName);
        } catch (error) {
          console.error('Error getting HL name:', error);
        } finally {
          setHlNameLoading(false);
        }
      }
    };
    fetchHLName();
  }, []);

  return (
    <DialogWrapper>
      <DialogHeader
        title={`${nftInstance.token.name} #${nftInstance.id}`}
        onClose={onBack}
        icon={<ArrowLeft className="size-4 text-white" />}
        rightContent={
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-all duration-300 cursor-pointer"
            onClick={() => {
              window.open(
                `https://www.hyperscan.com/token/${nftInstance.token.address}/instance/${nftInstance.id}`,
                '_blank'
              );
            }}
          >
            <TravelExplore className="size-5 text-white" />
          </button>
        }
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="border-2 border-[var(--primary-color-light)]/20 rounded-lg overflow-hidden aspect-square">
            <NFTImage
              imageUrl={nftInstance.image_url}
              alt={nftInstance.token.name}
              className="size-full object-contain"
              tokenName={nftInstance.token.name}
              tokenId={nftInstance.id}
              onError={(error: Error) => {
                console.error('NFT instance image failed to load:', {
                  tokenName: nftInstance.token.name,
                  instanceId: nftInstance.id,
                  imageUrl: nftInstance.image_url,
                  error: error.message,
                });
              }}
            />
          </div>
          <div className="rounded-lg overflow-hidden">
            {nftInstance.metadata?.description &&
              nftInstance.metadata?.description !== '' && (
                <div className="w-full bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3">
                  <p className="text-base w-full text-left font-semibold">
                    Description
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {nftInstance.metadata?.description}
                  </p>
                </div>
              )}
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer border-b border-white/10 p-3 gap-2">
              <p className="text-base text-left font-semibold">Collection</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                {nftInstance.token.name} ({nftInstance.token.symbol})
              </p>
            </div>
            <div className="w-full flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer p-3 gap-2">
              <p className="text-base text-left font-semibold">Network</p>
              <p className="text-sm text-muted-foreground text-right truncate w-full">
                Hyperliquid
              </p>
            </div>
            {isHlName && hlName && !hlNameLoading && (
              <a
                href={`https://app.hlnames.xyz/profile/${hlName}`}
                target="_blank"
                className="w-full flex items-center justify-center bg-[var(--card-color)]/80 hover:bg-[var(--card-color)]/60 transition-colors duration-200 cursor-pointer p-3 gap-2"
              >
                <p className="text-base text-center font-semibold text-[var(--primary-color-light)]">
                  See on Hyperliquid Names
                </p>
              </a>
            )}
          </div>
          {nftInstance.metadata?.attributes?.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-1">Properties</h3>
              <div className="flex flex-col rounded-lg overflow-hidden">
                {nftInstance.metadata?.attributes?.length > 0 &&
                  nftInstance.metadata?.attributes?.map(attribute => (
                    <div
                      key={attribute.trait_type}
                      className="flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--card-color)]/80 transition-colors duration-200 cursor-pointer p-3 gap-2 border-b border-white/10 last:border-b-0"
                    >
                      <p className="text-sm text-muted-foreground truncate w-full">
                        {attribute.trait_type}
                      </p>
                      <p className="text-sm text-muted-foreground truncate w-full">
                        {attribute.value}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};

export default NftInstancesIdDialog;
