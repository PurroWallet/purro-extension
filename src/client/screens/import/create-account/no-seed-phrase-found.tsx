import { Button } from "@/client/components/ui";
import { AlertCircle, Plus } from "lucide-react";

interface NoSeedPhraseFoundProps {
  onGenerateSeedPhrase: () => void;
  isGenerating: boolean;
  error: string;
}

const NoSeedPhraseFound = ({
  onGenerateSeedPhrase,
  isGenerating,
  error,
}: NoSeedPhraseFoundProps) => {
  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="size-16 text-yellow-500" />
        <h1 className="text-xl font-bold text-center">
          No Recovery Phrase Found
        </h1>
        <p className="text-base text-gray-200 text-center max-w-md">
          You need to have at least one recovery phrase to create a new account
          from existing seed phrase.
        </p>
        <p className="text-base text-gray-200 text-center max-w-md">
          You can create a new wallet with a fresh recovery phrase instead.
        </p>

        {error && (
          <div className="text-red-500 text-sm text-center max-w-md">
            {error}
          </div>
        )}
      </div>

      <div className="w-full flex items-center justify-center gap-2">
        <Button
          className="w-full"
          onClick={onGenerateSeedPhrase}
          disabled={isGenerating}
        >
          <Plus className="size-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Recovery Phrase"}
        </Button>
      </div>
    </div>
  );
};

export default NoSeedPhraseFound;
