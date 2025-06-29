import { useEffect, useState } from "react";
import logo from "@/assets/icon.png";
import { Button } from "@/client/component/ui/button";
import { CircleArrowDown, CirclePlus } from "lucide-react";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { openSidePanel } from "@/client/lib/utils";
import { LoadingDisplay } from "@/client/component/display";

const Welcome = ({
  onCreate,
  onImport,
}: {
  onCreate: () => void;
  onImport: () => void;
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { hasWallet, loadWalletState, loading } = useWalletStore();

  useEffect(() => {
    loadWalletState();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      {loading && <LoadingDisplay />}
      {!loading && (
        <>
          <div className="flex-1 size-full flex flex-col items-center justify-center gap-2">
            <img src={logo} alt="logo" className="size-24" />
            {hasWallet && (
              <>
                <h1 className="text-2xl font-semibold font-livvic">PURRO</h1>
                <p className="text-lg text-gray-300">
                  Your Already Have a Wallet
                </p>
              </>
            )}
            {!hasWallet && (
              <>
                <h1 className="text-2xl font-semibold font-livvic">
                  Welcome to Purro
                </h1>
                <p className="text-lg text-gray-300">
                  Your Gateway to Hyperliquid
                </p>
              </>
            )}
          </div>

          {!hasWallet && (
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="sr-only"
                />
                <label
                  htmlFor="terms-checkbox"
                  className={`
              size-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200
              ${
                acceptedTerms
                  ? "bg-[var(--primary-color-light)] border-[var(--primary-color-light)]"
                  : "bg-transparent border-gray-400 hover:border-[var(--primary-color-light)]"
              }
            `}
                >
                  {acceptedTerms && (
                    <svg
                      className="w-3 h-3 text-black"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </label>
              </div>
              <div className="text-sm text-gray-500 text-left">
                I accept the{" "}
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary-color)] underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary-color)] underline"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          )}

          {!hasWallet && (
            <div className="space-y-2 w-full">
              <Button
                className="w-full"
                disabled={!acceptedTerms}
                onClick={() => onCreate()}
              >
                <CirclePlus className="size-5" /> Create New Wallet
              </Button>
              <Button
                className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80"
                disabled={!acceptedTerms}
                onClick={() => onImport()}
              >
                <CircleArrowDown className="size-5" /> Import Existing Wallet
              </Button>
            </div>
          )}

          {hasWallet && (
            <Button
              className="w-full"
              onClick={async () => {
                await openSidePanel();
              }}
            >
              Open Your Wallet
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default Welcome;
