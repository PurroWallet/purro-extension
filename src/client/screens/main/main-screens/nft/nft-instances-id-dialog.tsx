import TravelExplore from '@/assets/icon-component/travel-explore';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import { Menu } from '@/client/components/ui/menu';
import { NFTImage } from '@/client/components/nft-image';
import { HyperScanNftInstancesItem } from '@/client/types/hyperscan-api';
import { ArrowLeft, Hash } from 'lucide-react';
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
    nftInstance.token?.address_hash ===
    '0x1d9d87eBc14e71490bB87f1C39F65BDB979f3cb7';

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
        } catch (error) {
          console.error('Error getting HL name:', error);
        } finally {
          setHlNameLoading(false);
        }
      }
    };
    fetchHLName();
  }, []);

  // Prepare menu items for NFT details
  const nftDetailsItems = [
    // Description item (conditional)
    ...(nftInstance.metadata?.description &&
    nftInstance.metadata?.description !== ''
      ? [
          {
            label: 'Description',
            description: nftInstance.metadata?.description,
            isLongDescription: true,
          },
        ]
      : []),
    {
      label: 'Collection',
      description: `${nftInstance.token?.name || 'Unknown'} (${nftInstance.token?.symbol || 'N/A'})`,
    },
    {
      label: 'Network',
      description: 'Hyperliquid',
    },
    // HL Names link item (conditional)
    ...(isHlName && hlName && !hlNameLoading
      ? [
          {
            label: 'View on Hyperliquid Names',
            onClick: () => {
              window.open(
                `https://app.hlnames.xyz/profile/${hlName}`,
                '_blank',
                'noopener,noreferrer'
              );
            },
            isCentered: true,
            itemClassName: 'text-[var(--primary-color-light)]',
          },
        ]
      : []),
  ];

  // Properties items
  const propertiesItems =
    nftInstance.metadata?.attributes?.map((attribute: any) => ({
      icon: Hash,
      label: attribute.trait_type,
      description: attribute.value,
    })) || [];

  return (
    <DialogWrapper>
      <DialogHeader
        title={`${nftInstance.token?.name || 'Unknown'} #${nftInstance.id}`}
        onClose={onBack}
        icon={<ArrowLeft className="size-4 text-white" />}
        rightContent={
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-all duration-300 cursor-pointer"
            onClick={() => {
              window.open(
                `https://www.hyperscan.com/token/${nftInstance.token?.address_hash}/instance/${nftInstance.id}`,
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
              alt={nftInstance.token?.name || 'Unknown'}
              className="size-full object-contain"
              tokenName={nftInstance.token?.name || 'Unknown'}
              tokenId={nftInstance.id}
              onError={(error: Error) => {
                console.error('NFT instance image failed to load:', {
                  tokenName: nftInstance.token?.name || 'Unknown',
                  instanceId: nftInstance.id,
                  imageUrl: nftInstance.image_url,
                  error: error.message,
                });
              }}
            />
          </div>

          {/* NFT Details using Menu component */}
          <Menu items={nftDetailsItems} />

          {/* Properties section */}
          {nftInstance.metadata?.attributes?.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-1">Properties</h3>
              <Menu items={propertiesItems} />
            </div>
          )}
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};

export default NftInstancesIdDialog;
