import { Button } from "@/client/components/ui";
import SeedPhraseRender from "@/client/components/render/seed-phrase-render";

interface ShowGeneratedSeedPhraseProps {
  seedPhrase: string;
  onCreateWallet: () => void;
  isCreating: boolean;
  error: string;
}

const ShowGeneratedSeedPhrase = ({
  seedPhrase,
  onCreateWallet,
  isCreating,
  error,
}: ShowGeneratedSeedPhraseProps) => {
  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 space-y-4">
        <h1 className="text-xl font-bold text-center">Your Recovery Phrase</h1>

        <div className="w-full max-w-md">
          <SeedPhraseRender seedPhrase={seedPhrase} />
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center max-w-md">
            {error}
          </div>
        )}
      </div>

      <div className="w-full flex items-center justify-center gap-2">
        <Button
          className="w-full"
          onClick={onCreateWallet}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create Wallet"}
        </Button>
      </div>
    </div>
  );
};

export default ShowGeneratedSeedPhrase;
