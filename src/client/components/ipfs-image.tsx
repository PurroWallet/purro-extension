import React, { useState, useEffect } from "react";
import { fetchWithFallback } from "@/client/lib/ipfs";

interface IpfsImageProps {
  cid: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  alt?: string;
}

// Check if URL is an IPFS URL
function isIpfsUrl(url: string): boolean {
  if (!url) return false;
  // More specific IPFS URL detection
  return /^(ipfs:\/\/|.*\/ipfs\/|.*\.ipfs\.|^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{50,}$)/i.test(
    url
  );
}

// Check if URL is a regular HTTP/HTTPS URL
function isHttpUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

// Check if URL is a data URI (base64 encoded image)
function isDataUri(url: string): boolean {
  if (!url) return false;
  return /^data:image\//i.test(url);
}

// Utility function to extract CID from IPFS URL
function extractCidFromUrl(input: string): string {
  if (!input) return input;

  // If it's already a CID (starts with Qm or baf), return as is
  if (input.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{50,})/)) {
    return input;
  }

  // Extract CID from various IPFS URL formats
  const patterns = [
    /\/ipfs\/([^\/\?#]+)/i, // https://gateway.com/ipfs/QmXXX
    /ipfs:\/\/([^\/\?#]+)/i, // ipfs://QmXXX
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If no pattern matches, assume it's already a CID
  return input;
}

export const IpfsImage: React.FC<IpfsImageProps> = ({
  cid,
  className,
  style,
  fallbackSrc,
  placeholder,
  onLoad,
  onError,
  alt = "IPFS Image",
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cid || cid.trim() === "") {
      setLoading(false);
      setImageUri(null);
      // Don't set error, just show fallback or placeholder
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Loading image with CID:", cid);

        // Check if it's a data URI first (base64 encoded image)
        if (isDataUri(cid)) {
          console.log("Using data URI directly:", cid.substring(0, 50) + "...");
          setImageUri(cid);
          onLoad?.();
          return;
        }

        // Check if it's a regular HTTP URL
        if (isHttpUrl(cid)) {
          console.log("Using HTTP URL directly:", cid);
          setImageUri(cid);
          onLoad?.();
          return;
        }

        // Check if it's an IPFS URL
        if (isIpfsUrl(cid)) {
          console.log("Processing IPFS URL:", cid);
          // Extract CID from URL if needed
          const actualCid = extractCidFromUrl(cid);
          console.log("Extracted CID:", actualCid);

          const response = await fetchWithFallback(actualCid);

          // Check if response is valid
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }

          const blob = await response.blob();

          // Check if blob is actually an image
          if (!blob.type.startsWith("image/")) {
            console.warn("Blob is not an image type:", blob.type);
          }

          const uri = URL.createObjectURL(blob);
          setImageUri(uri);
          onLoad?.();
        } else {
          // If it's neither HTTP nor IPFS, try to use it as a direct CID
          console.log("Treating as direct CID:", cid);
          const response = await fetchWithFallback(cid);
          const blob = await response.blob();
          const uri = URL.createObjectURL(blob);
          setImageUri(uri);
          onLoad?.();
        }
      } catch (err) {
        console.error("Failed to load image:", err, "CID:", cid);
        const error =
          err instanceof Error ? err : new Error("Failed to load image");
        setError(error);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup object URL on unmount (only for blob URLs)
    return () => {
      if (imageUri && imageUri.startsWith("blob:")) {
        URL.revokeObjectURL(imageUri);
      }
    };
  }, [cid]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${
          className || ""
        }`}
        style={style}
      >
        {placeholder || (
          <div className="flex flex-col items-center justify-center p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span className="mt-1 text-xs text-gray-600">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    if (fallbackSrc) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={className}
          style={style}
          onLoad={onLoad}
          onError={(_e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            console.error("Fallback image also failed to load:", fallbackSrc);
            // Don't set error again to prevent infinite loop
            // Just let the fallback image show as broken
          }}
        />
      );
    }

    return (
      <div
        className={`flex items-center justify-center bg-card text-muted-foreground ${
          className || ""
        }`}
        style={style}
      >
        <div className="text-center p-2">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-xs">Image not available</div>
        </div>
      </div>
    );
  }

  if (!imageUri) {
    if (fallbackSrc) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={className}
          style={style}
          onLoad={onLoad}
          onError={(_e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            console.error("Fallback image failed to load:", fallbackSrc);
          }}
        />
      );
    }

    return (
      <div
        className={`flex items-center justify-center bg-card text-muted-foreground ${
          className || ""
        }`}
        style={style}
      >
        <div className="text-center p-2">
          <div className="text-2xl mb-1">📷</div>
          <div className="text-xs">No image</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUri}
      alt={alt}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={(_e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.error("Image failed to render:", imageUri);
        const error = new Error("Image failed to load");
        setError(error);
        onError?.(error);
      }}
    />
  );
};
