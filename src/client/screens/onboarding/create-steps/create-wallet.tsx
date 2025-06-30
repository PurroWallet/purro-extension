import { useEffect, useState } from "react";
import SeedPhraseRender from "@/client/component/render/seed-phrase-render";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import { Button } from "@/client/component/ui";
import { ErrorDisplay } from "@/client/component/display";
import { generateMnemonic } from "@/client/lib/utils";

const CreateWallet = ({ onNext }: { onNext: () => void }) => {
  const { mnemonic, setMnemonic } = useCreateWalletStore();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleGenerateSeedPhrase = async () => {
      try {
        const mnemonic = generateMnemonic();
        if (mnemonic) {
          setMnemonic(mnemonic);
        } else {
          setError("Failed to generate mnemonic");
        }
      } catch (error) {
        setError(error as string);
      }
    };

    handleGenerateSeedPhrase();
  }, [setMnemonic]);

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">
            Your Seed Phrase
          </h2>
          <SeedPhraseRender seedPhrase={mnemonic} />
        </div>

        {error && <ErrorDisplay />}
      </div>

      <Button
        className="w-full col-span-2"
        disabled={!mnemonic || !!error}
        onClick={() => onNext()}
      >
        Create Wallet
      </Button>
    </div>
  );
};

export default CreateWallet;
