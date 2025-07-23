import React from "react";
import { IpfsImage } from "@/client/components/ipfs-image";
import placeholderNft from "@/assets/placeholder-nft.png";

interface NFTImageProps {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  tokenName?: string;
  tokenId?: string;
}

export const NFTImage: React.FC<NFTImageProps> = ({
  imageUrl,
  alt,
  className = "",
  style,
  onLoad,
  onError,
  tokenName = "NFT",
  tokenId,
}) => {
  // Generate meaningful alt text
  const imageAlt = alt || `${tokenName}${tokenId ? ` #${tokenId}` : ""}`;

  // If no image URL provided, show placeholder immediately
  if (!imageUrl || imageUrl.trim() === "") {
    return (
      <div
        className={`flex items-center justify-center bg-card ${className}`}
        style={style}
      >
        <img
          src={placeholderNft}
          alt={imageAlt}
          className="size-full object-contain opacity-75"
          onLoad={onLoad}
          onError={(_e) => {
            console.error("Placeholder NFT image failed to load");
            onError?.(new Error("Placeholder image failed"));
          }}
        />
      </div>
    );
  }

  // Use IpfsImage with guaranteed placeholder fallback
  return (
    <IpfsImage
      cid={imageUrl}
      alt={imageAlt}
      className={`bg-card ${className}`}
      style={style}
      fallbackSrc={placeholderNft}
      onLoad={onLoad}
      onError={(error) => {
        console.error("NFT image failed to load:", {
          tokenName,
          tokenId,
          imageUrl,
          error: error.message,
        });
        onError?.(error);
      }}
    />
  );
};
