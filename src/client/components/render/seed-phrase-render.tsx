import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/client/components/ui";

interface SeedPhraseRenderProps {
  seedPhrase?: string;
  className?: string;
  isCopyable?: boolean;
}

const SeedPhraseRender: React.FC<SeedPhraseRenderProps> = ({
  seedPhrase,
  className = "",
  isCopyable = true,
}) => {
  const [copied, setCopied] = useState(false);

  const words = seedPhrase?.split(" ") || [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy seed phrase:", error);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="grid grid-cols-3 gap-3">
        {words.map((word, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-3 bg-[var(--card-color)] border border-white/10 rounded-lg"
          >
            <span className="text-xs text-gray-400 min-w-[20px]">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-white">{word}</span>
          </div>
        ))}
      </div>

      {isCopyable && (
        <Button
          onClick={handleCopy}
          className="w-full flex items-center gap-2 bg-transparent border border-white/20 text-white hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy Seed Phrase
            </>
          )}
        </Button>
      )}

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-sm text-yellow-200">
          <strong>⚠️ Important:</strong> Store your seed phrase in a safe place.
          Never share it with anyone. This is the only way to recover your
          wallet.
        </p>
      </div>
    </div>
  );
};

export default SeedPhraseRender;
