import { useEffect, useState } from "react";
import logo from "@/assets/icon.png";
import Discord from "@/assets/icon-component/discord";
import XTwitter from "@/assets/icon-component/x-twitter";
import { openSidePanel } from "@/client/lib/utils";
import useWalletStore from "@/client/hooks/use-wallet-store";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import { LoadingDisplay, ErrorDisplay } from "@/client/components/display";
import { Button } from "@/client/components/ui";
import useWallet from "@/client/hooks/use-wallet";
import {
  ChainType,
  supportedChain,
  SupportedChainType,
} from "@/background/types/account";

const Finish = () => {
  const {
    password,
    mnemonic,
    privateKey,
    reset,
    chain,
    accountName,
    importType,
  } = useCreateWalletStore();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const { accounts } = useWalletStore();
  const { createWallet, importPrivateKey } = useWallet();

  useEffect(() => {
    const handleWalletOperation = async () => {
      // Prevent multiple executions
      if (hasExecuted || isLoading) {
        return;
      }

      setHasExecuted(true);
      setIsLoading(true);
      setError("");
      setIsSuccess(false);

      try {
        // Validate required data
        if (!password || password.trim() === "") {
          throw new Error("Password is required");
        }

        // Handle based on import type
        if (importType === "seed") {
          // Import wallet from seed phrase
          if (!mnemonic || mnemonic.trim() === "") {
            throw new Error("Seed phrase is required");
          }
          await createWallet({
            password,
            mnemonic,
          });
        } else if (importType === "privateKey") {
          // Import wallet from private key
          if (!privateKey || !privateKey.trim() || !chain) {
            throw new Error("Private key and chain are required");
          }
          if (!supportedChain.includes(chain as SupportedChainType)) {
            throw new Error("Invalid chain");
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
            password,
            accountName:
              accountName ||
              `Account ${accounts.length > 0 ? accounts.length + 1 : 1}`,
            chain: chainType,
          });
        } else {
          // Default: Create new wallet (no importType set)
          // Use the seed phrase that was shown to user for backup
          if (!mnemonic || mnemonic.trim() === "") {
            throw new Error("Seed phrase is required");
          }
          await createWallet({
            password,
            mnemonic,
          });
        }

        // Reset store after successful operation
        try {
          reset();
        } catch (resetError) {
          console.error("Error resetting store:", resetError);
        }

        setIsSuccess(true);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
        setIsSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Only execute if we have the required data and haven't executed yet
    if (
      (importType === "seed" ||
        importType === "privateKey" ||
        (!importType && mnemonic)) &&
      !hasExecuted
    ) {
      handleWalletOperation();
    }
  }, [
    createWallet,
    importPrivateKey,
    importType,
    password,
    mnemonic,
    privateKey,
    chain,
    accountName,
    accounts.length,
    reset,
    hasExecuted,
    isLoading,
  ]);

  // Get content based on operation type
  const getSuccessContent = () => {
    if (importType === "seed") {
      return {
        title: "Wallet Imported Successfully!",
        description: "Your wallet has been imported from seed phrase.",
      };
    } else if (importType === "privateKey") {
      return {
        title: "Account Imported Successfully!",
        description: "Your account has been imported from private key.",
      };
    } else {
      // Default: Create new wallet
      return {
        title: "You're all set!",
        description: "Your Purro wallet has been created successfully.",
      };
    }
  };

  const successContent = getSuccessContent();

  const socialLinks = [
    {
      name: "About Purro",
      url: "https://purro.xyz",
      icon: <img src={logo} alt="logo" className="size-6" />,
    },
    {
      name: "@purro_xyz",
      url: "https://x.com/purro_xyz",
      icon: <XTwitter className="size-6" />,
    },
    {
      name: "Discord",
      url: "https://discord.gg/VJunuK9T5w",
      icon: <Discord className="size-6" />,
    },
  ];

  const handleSocialClick = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full flex flex-col items-center justify-center gap-4">
        {isLoading && <LoadingDisplay />}

        {!isLoading && error && <ErrorDisplay />}

        {!isLoading && !error && isSuccess && (
          <>
            <img src={logo} alt="logo" className="size-24" />
            <h1 className="text-2xl font-bold">{successContent.title}</h1>
            <p className="text-lg text-gray-500">
              {successContent.description}
            </p>

            <div className="grid grid-cols-3 gap-2 justify-center w-full mt-6">
              {socialLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleSocialClick(link.url)}
                  className="flex flex-col items-center gap-2 px-4 py-2 bg-[var(--card-color)] rounded-lg transition-colors text-sm hover:bg-[var(--card-color)]/80 cursor-pointer"
                >
                  <span>{link.icon}</span>
                  <span>{link.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Button
        onClick={async () => {
          await openSidePanel();
        }}
        className="w-full"
      >
        Explore Your Wallet
      </Button>
    </div>
  );
};

export default Finish;
