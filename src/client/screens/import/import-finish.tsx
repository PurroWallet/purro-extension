import { useEffect, useState } from "react";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import ErorrDisplay from "@/client/component/display/error-display";
import LoadingDisplay from "@/client/component/display/loading-display";
import { Button } from "@/client/component/ui";
import logo from "@/assets/icon.png";
import { openSidePanel } from "@/client/lib/utils";
import useWallet from "@/client/hooks/use-wallet";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { ChainType } from "@/background/types/account";

const ImportFinish = ({ onBack }: { onBack: () => void }) => {
  const { importSeedPhrase, importPrivateKey, createAccountFromSeedPhrase } =
    useWallet();
  const { accounts } = useWalletStore();
  const {
    mnemonic,
    privateKey,
    reset,
    chain,
    accountName,
    selectedSeedPhraseId,
    importType,
  } = useCreateWalletStore();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);

  useEffect(() => {
    const handleCreateWallet = async () => {
      // Prevent multiple executions
      if (hasExecuted || isLoading) {
        return;
      }

      setHasExecuted(true);
      setIsLoading(true);
      setError(""); // Clear any previous errors
      setIsSuccess(false); // Clear any previous success state

      try {
        switch (importType) {
          case "create-account":
            // Check if this is a new wallet creation (no selectedSeedPhraseId)
            // or account creation from existing seed phrase
            if (!selectedSeedPhraseId) {
              // New wallet was already created in the previous step, just mark as successful
            } else {
              const finalAccountName =
                accountName || `Account ${accounts.length + 1}`;
              await createAccountFromSeedPhrase({
                seedPhraseId: selectedSeedPhraseId,
                name: finalAccountName,
              });
            }
            break;

          case "seed":
            if (!mnemonic || !mnemonic.trim()) {
              throw new Error("No seed phrase provided for import");
            }
            const finalAccountName =
              accountName || `Account ${accounts.length + 1}`;
            const seedPhraseId = await importSeedPhrase({
              mnemonic: mnemonic.trim(),
              accountName: finalAccountName,
            });
            await createAccountFromSeedPhrase({
              seedPhraseId: seedPhraseId,
              name: finalAccountName,
            });
            break;

          case "privateKey":
            if (!privateKey || !privateKey.trim() || !chain) {
              throw new Error("Private key and chain are required for import");
            }
            let chainType: ChainType;
            if (
              chain === "hyperevm" ||
              chain === "base" ||
              chain === "arbitrum" ||
              chain === "ethereum"
            ) {
              chainType = "eip155";
            } else {
              chainType = chain;
            }
            await importPrivateKey({
              privateKey,
              accountName:
                accountName ||
                `Account ${accounts.length > 0 ? accounts.length + 1 : 1}`,
              chain: chainType,
            });
            break;

          case "watchOnly":
            break;

          default:
            console.error("❌ ImportFinish: Invalid import type:", importType);
            throw new Error(
              "Invalid import type. Please select a valid import method."
            );
        }

        // Only set success if we reach this point without errors
        try {
          reset();
        } catch (resetError) {
          console.error(
            "⚠️ ImportFinish: Reset error (non-critical):",
            resetError
          );
          // Don't throw here, just log the error
        }

        setIsSuccess(true);
      } catch (error) {
        console.error("❌ ImportFinish: Error occurred:", error);
        console.error("❌ ImportFinish: Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : "No stack trace",
        });
        setError(error instanceof Error ? error.message : String(error));
        setIsSuccess(false); // Ensure success is false on error
      } finally {
        setIsLoading(false);
      }
    };

    // Only proceed if we have a valid import type and haven't executed yet
    if (importType && !hasExecuted) {
      handleCreateWallet();
    }
  }, [
    importType,
    // Remove other dependencies to prevent re-execution
  ]);

  // Get content based on import type
  const getSuccessContent = () => {
    switch (importType) {
      case "create-account":
        return {
          title: "Account Created!",
          description: "Your new account has been created successfully.",
        };
      case "seed":
        return {
          title: "Recovery Phrase Imported!",
          description: "Your wallet has been imported successfully.",
        };
      case "privateKey":
        return {
          title: "Private Key Imported!",
          description: "Your account has been imported successfully.",
        };
      case "watchOnly":
        return {
          title: "Watch-Only Wallet Imported!",
          description: "Your watch-only wallet has been imported successfully.",
        };
      default:
        return {
          title: "Success!",
          description: "Operation completed successfully.",
        };
    }
  };

  const successContent = getSuccessContent();

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full flex flex-col items-center justify-center gap-4">
        {isLoading && <LoadingDisplay />}

        {!isLoading && error && <ErorrDisplay />}

        {!isLoading && !error && isSuccess && (
          <>
            <img src={logo} alt="logo" className="size-24" />
            <h1 className="text-2xl font-bold text-center">
              {successContent.title}
            </h1>
            <p className="text-lg text-gray-500 text-center">
              {successContent.description}
            </p>
          </>
        )}
      </div>

      <div className="w-full flex items-center justify-center gap-2">
        <Button
          className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80"
          onClick={onBack}
        >
          Add Another
        </Button>
        <Button
          onClick={async () => {
            await openSidePanel();
            window.close();
          }}
          className="w-full"
        >
          Done
        </Button>
      </div>
    </div>
  );
};

export default ImportFinish;
