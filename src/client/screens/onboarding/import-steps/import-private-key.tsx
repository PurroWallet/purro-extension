import { Button } from "@/client/component/ui/button";
import { InputPassword } from "@/client/component/ui";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import { Check, X } from "lucide-react";
import { useState } from "react";
import useWallet from "@/client/hooks/use-wallet";
import useWalletStore from "@/client/hooks/use-wallet-store";
import {
  evmWalletKeyUtils,
  solanaWalletKeyUtils,
  suiWalletKeyUtils,
} from "@/background/utils/keys";

const ImportPrivateKey = ({ onNext }: { onNext: () => void }) => {
  const { chain, privateKey, setPrivateKey, accountName, setAccountName } =
    useCreateWalletStore();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const { checkPrivateKeyExists } = useWallet();
  const { accounts } = useWalletStore();

  const validatePrivateKey = async () => {
    if (!privateKey) {
      console.log("❌ Validation failed: No private key provided");
      return false;
    }

    console.log(`🔍 Validating private key for chain: ${chain}`);
    console.log(`📝 Private key length: ${privateKey.length} characters`);

    try {
      // First validate the private key format and get address
      let isValid = false;
      let walletAddress = "";

      // EVM chains (Ethereum, Hyperliquid, Base, Arbitrum) all use the same validation
      if (
        chain === "ethereum" ||
        chain === "hyperliquid" ||
        chain === "base" ||
        chain === "arbitrum"
      ) {
        console.log(`🔗 Processing EVM chain: ${chain}`);
        console.log(`📋 Private key format check:`, {
          length: privateKey.length,
          startsWithOx: privateKey.startsWith("0x"),
          first10chars: privateKey.substring(0, 10),
          last10chars: privateKey.substring(privateKey.length - 10),
        });

        try {
          isValid = evmWalletKeyUtils.isValidPrivateKey(privateKey);
          console.log(`✅ EVM private key validation result: ${isValid}`);

          if (isValid) {
            const wallet = evmWalletKeyUtils.fromPrivateKey(privateKey);
            walletAddress = wallet.address;
            console.log(`🏠 EVM wallet address generated: ${walletAddress}`);
            console.log(`🔑 EVM wallet details:`, {
              privateKey: wallet.privateKey,
              publicKey: wallet.publicKey.substring(0, 20) + "...",
              address: wallet.address,
            });
          } else {
            console.log(
              `❌ EVM private key validation failed - trying to understand why...`
            );

            // Try to create wallet anyway to see what happens
            try {
              const testWallet = evmWalletKeyUtils.fromPrivateKey(privateKey);
              console.log(`🧪 Test wallet creation succeeded:`, {
                inputKey: privateKey,
                walletKey: testWallet.privateKey,
                address: testWallet.address,
                keysMatch: privateKey === testWallet.privateKey,
                normalizedMatch:
                  (privateKey.startsWith("0x")
                    ? privateKey
                    : `0x${privateKey}`
                  ).toLowerCase() === testWallet.privateKey.toLowerCase(),
              });
            } catch (testError) {
              console.error(`🧪 Test wallet creation failed:`, testError);
            }
          }
        } catch (evmError) {
          console.error(`❌ EVM validation error for ${chain}:`, evmError);
          isValid = false;
        }
      } else if (chain === "solana") {
        console.log("🔗 Processing Solana chain");
        try {
          isValid = solanaWalletKeyUtils.isValidPrivateKey(privateKey);
          console.log(`✅ Solana private key validation result: ${isValid}`);

          if (isValid) {
            const wallet = solanaWalletKeyUtils.fromPrivateKey(privateKey);
            walletAddress = wallet.address;
            console.log(`🏠 Solana wallet address generated: ${walletAddress}`);
          }
        } catch (solanaError) {
          console.error("❌ Solana validation error:", solanaError);
          isValid = false;
        }
      } else if (chain === "sui") {
        console.log("🔗 Processing Sui chain");
        console.log(`📋 Sui private key format check:`, {
          length: privateKey.length,
          startsWithOx: privateKey.startsWith("0x"),
          first10chars: privateKey.substring(0, 10),
          last10chars: privateKey.substring(privateKey.length - 10),
          isValidHex: /^[0-9a-fA-F]+$/.test(
            privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey
          ),
        });

        try {
          isValid = suiWalletKeyUtils.isValidPrivateKey(privateKey);
          console.log(`✅ Sui private key validation result: ${isValid}`);

          if (isValid) {
            const wallet = suiWalletKeyUtils.fromPrivateKey(privateKey);
            walletAddress = wallet.address;
            console.log(`🏠 Sui wallet address generated: ${walletAddress}`);
            console.log(`🔑 Sui wallet details:`, {
              privateKey: wallet.privateKey,
              publicKey: wallet.publicKey.substring(0, 20) + "...",
              address: wallet.address,
            });
          } else {
            console.log(
              `❌ Sui private key validation failed - trying to understand why...`
            );

            // Try to create wallet anyway to see what happens
            try {
              const testWallet = suiWalletKeyUtils.fromPrivateKey(privateKey);
              console.log(`🧪 Sui test wallet creation succeeded:`, {
                inputKey: privateKey,
                walletKey: testWallet.privateKey,
                address: testWallet.address,
                publicKey: testWallet.publicKey,
              });
            } catch (testError) {
              console.error(`🧪 Sui test wallet creation failed:`, testError);
            }
          }
        } catch (suiError) {
          console.error("❌ Sui validation error:", suiError);
          isValid = false;
        }
      }

      if (!isValid) {
        console.error(`❌ Private key validation failed for chain: ${chain}`);
        throw new Error("Invalid private key. Please try again.");
      }

      // Set the address for display
      setAddress(walletAddress);
      console.log(`✅ Address set for display: ${walletAddress}`);

      // Check if private key already exists
      console.log("🔍 Checking if private key already exists...");
      try {
        const exists = await checkPrivateKeyExists(privateKey);
        console.log(`📋 Private key existence check result: ${exists}`);

        if (exists) {
          console.warn("⚠️ Private key already exists in wallet");
          setError("This private key is already imported.");
          return false;
        }
      } catch (checkError) {
        console.error("❌ Error checking private key existence:", checkError);
        // Continue with import even if check fails
      }

      console.log("✅ Private key validation completed successfully");
      return true;
    } catch (error) {
      console.error("❌ Private key validation failed with error:", error);
      console.error("📊 Error details:", {
        message: error instanceof Error ? error.message : String(error),
        chain,
        privateKeyLength: privateKey?.length || 0,
        stack: error instanceof Error ? error.stack : undefined,
      });

      setError("Invalid private key. Please try again.");
      setAddress(null);
      return false;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">Import Private Key</h1>
          <p className="text-base text-gray-500 text-center">
            {chain == null && "Select the chain"}
            {chain === "ethereum" && "Enter your Ethereum private key"}
            {chain === "solana" && "Enter your Solana private key"}
            {chain === "sui" && "Enter your Sui private key"}
            {chain === "hyperliquid" && "Enter your Hyperliquid private key"}
            {chain === "base" && "Enter your Base private key"}
            {chain === "arbitrum" && "Enter your Arbitrum private key"}
          </p>
        </div>
        {chain != null && (
          <div className="flex flex-col gap-2">
            <InputPassword
              placeholder={`Enter your ${chain} private key`}
              value={privateKey ?? ""}
              showToggle={false}
              onChange={async (e) => {
                const inputValue = e.target.value;
                console.log(
                  `📝 Private key input changed, length: ${inputValue.length}`
                );

                setPrivateKey(inputValue);
                setError(null); // Clear error when user types
                setAddress(null); // Clear address when user types

                // Validate and show address if private key is valid
                if (inputValue.trim()) {
                  console.log(`🔍 Real-time validation for chain: ${chain}`);

                  try {
                    let isValid = false;
                    let walletAddress = "";

                    // EVM chains (Ethereum, Hyperliquid, Base, Arbitrum) all use the same validation
                    if (
                      chain === "ethereum" ||
                      chain === "hyperliquid" ||
                      chain === "base" ||
                      chain === "arbitrum"
                    ) {
                      console.log(`🔗 Real-time EVM validation for: ${chain}`);
                      try {
                        isValid =
                          evmWalletKeyUtils.isValidPrivateKey(inputValue);
                        console.log(
                          `🔍 Real-time EVM isValidPrivateKey result: ${isValid}`
                        );

                        if (isValid) {
                          const wallet =
                            evmWalletKeyUtils.fromPrivateKey(inputValue);
                          walletAddress = wallet.address;
                          console.log(
                            `✅ Real-time EVM validation successful: ${isValid}, address: ${walletAddress}`
                          );
                        } else {
                          console.log(
                            `❌ Real-time EVM validation failed: private key format is invalid`
                          );
                        }
                      } catch (evmError) {
                        console.log(
                          `❌ Real-time EVM validation error for ${chain}:`,
                          evmError
                        );
                        isValid = false;
                      }
                    } else if (chain === "solana") {
                      console.log("🔗 Real-time Solana validation");
                      try {
                        isValid =
                          solanaWalletKeyUtils.isValidPrivateKey(inputValue);
                        console.log(
                          `🔍 Real-time Solana isValidPrivateKey result: ${isValid}`
                        );

                        if (isValid) {
                          const wallet =
                            solanaWalletKeyUtils.fromPrivateKey(inputValue);
                          walletAddress = wallet.publicKey;
                          console.log(
                            `✅ Real-time Solana validation successful: ${isValid}, publicKey: ${walletAddress}`
                          );
                        } else {
                          console.log(
                            `❌ Real-time Solana validation failed: private key format is invalid`
                          );
                        }
                      } catch (solanaError) {
                        console.log(
                          "❌ Real-time Solana validation error:",
                          solanaError
                        );
                        isValid = false;
                      }
                    } else if (chain === "sui") {
                      console.log("🔗 Real-time Sui validation");
                      try {
                        isValid =
                          suiWalletKeyUtils.isValidPrivateKey(inputValue);
                        console.log(
                          `🔍 Real-time Sui isValidPrivateKey result: ${isValid}`
                        );

                        if (isValid) {
                          const wallet =
                            suiWalletKeyUtils.fromPrivateKey(inputValue);
                          walletAddress = wallet.address;
                          console.log(
                            `✅ Real-time Sui validation successful: ${isValid}, address: ${walletAddress}`
                          );
                        } else {
                          console.log(
                            `❌ Real-time Sui validation failed: private key format is invalid`
                          );
                        }
                      } catch (suiError) {
                        console.log(
                          "❌ Real-time Sui validation error:",
                          suiError
                        );
                        isValid = false;
                      }
                    }

                    if (isValid && walletAddress) {
                      setAddress(walletAddress);
                      console.log(`✅ Real-time address set: ${walletAddress}`);

                      // Check if private key already exists
                      try {
                        // Map chain names to ChainType
                        let chainType: "eip155" | "solana" | "sui";
                        if (
                          chain === "ethereum" ||
                          chain === "hyperliquid" ||
                          chain === "base" ||
                          chain === "arbitrum"
                        ) {
                          chainType = "eip155";
                        } else if (chain === "solana") {
                          chainType = "solana";
                        } else if (chain === "sui") {
                          chainType = "sui";
                        } else {
                          console.warn(`⚠️ Unknown chain type: ${chain}`);
                          return; // Unknown chain type
                        }

                        console.log(
                          `🔍 Real-time checking private key existence for chainType: ${chainType}`
                        );
                        const exists = await checkPrivateKeyExists(inputValue);
                        console.log(
                          `📋 Real-time existence check result: ${exists}`
                        );

                        if (exists) {
                          console.warn(
                            "⚠️ Real-time check: Private key already exists"
                          );
                          setError("This private key is already imported.");
                          setAddress(null);
                        }
                      } catch (error) {
                        console.log(
                          "❌ Real-time existence check error (ignored):",
                          error
                        );
                        // Ignore check errors during typing
                      }
                    } else {
                      console.log(
                        "❌ Real-time validation failed or no address generated"
                      );
                    }
                  } catch (error) {
                    console.log(
                      "❌ Real-time validation error (ignored):",
                      error
                    );
                    // Ignore validation errors during typing
                  }
                } else {
                  console.log("📝 Input is empty, skipping validation");
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  console.log("⌨️ Enter key pressed, triggering validation");
                  if (await validatePrivateKey()) {
                    console.log(
                      "✅ Validation successful, proceeding to next step"
                    );
                    onNext();
                  } else {
                    console.log(
                      "❌ Validation failed, staying on current step"
                    );
                    // Error is already set in validatePrivateKey
                  }
                }
              }}
            />

            <input
              type="text"
              placeholder={`Account ${accounts.length + 1}`}
              value={accountName ?? ""}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white placeholder-gray-400 text-base"
            />

            {error && (
              <div className="text-red-500 mt-2 text-base flex items-center gap-1">
                <X />
                {error}
              </div>
            )}
            {address && (
              <div className="text-[var(--primary-color-light)] mt-2 text-sm flex items-center gap-1 break-all">
                <Check />
                {address}
              </div>
            )}
          </div>
        )}
      </div>
      <Button
        className="w-full"
        disabled={!privateKey}
        onClick={async () => {
          console.log("🔘 Import button clicked");
          if (await validatePrivateKey()) {
            console.log(
              "✅ Final validation successful, proceeding to next step"
            );
            onNext();
          } else {
            console.log("❌ Final validation failed, staying on current step");
            // Error is already set in validatePrivateKey
          }
        }}
      >
        Import
      </Button>
    </div>
  );
};

export default ImportPrivateKey;
