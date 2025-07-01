import {
  Button,
  DialogContent,
  DialogFooter,
  DialogWrapper,
  IconButton,
  InputPassword,
} from "@/client/component/ui";
import { DialogHeader } from "@/client/component/ui";
import { useState, useEffect } from "react";
import useWallet from "@/client/hooks/use-wallet";
import { Trash2 } from "lucide-react";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { SeedPhraseWithId } from "@/types";

interface DeleteSeedPhraseProps {
  onBack: () => void;
}

const DeleteSeedPhrase = ({ onBack }: DeleteSeedPhraseProps) => {
  const [selectedSeedPhraseId, setSelectedSeedPhraseId] = useState<
    string | null
  >(null);
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedPhrases, setSeedPhrases] = useState<SeedPhraseWithId[]>([]);

  const { accounts, hasWallet } = useWalletStore();
  const { getAllSeedPhrases, removeSeedPhrase } = useWallet();

  const selectedSeedPhrase = seedPhrases.find(
    (sp) => sp.id === selectedSeedPhraseId
  );
  const relatedAccounts = accounts.filter(
    (acc) => acc.seedPhraseId === selectedSeedPhraseId
  );

  // Check if deleting this seed phrase will remove all accounts
  const willResetWallet = relatedAccounts.length === accounts.length;

  useEffect(() => {
    // If wallet no longer exists (was reset), redirect to onboarding
    if (!hasWallet) {
      window.location.href = "/onboarding.html";
    }
  }, [hasWallet]);

  useEffect(() => {
    const fetchSeedPhrases = async () => {
      const seedPhrases = await getAllSeedPhrases();
      setSeedPhrases(seedPhrases);
    };
    fetchSeedPhrases();
  }, [getAllSeedPhrases]);

  const handleSelectSeedPhrase = (seedPhraseId: string) => {
    setSelectedSeedPhraseId(seedPhraseId);
    setStep("confirm");
  };

  const handleDelete = async () => {
    if (!selectedSeedPhraseId || !password) return;

    try {
      setIsDeleting(true);
      setError(null);
      await removeSeedPhrase(selectedSeedPhraseId, password);

      // If this won't reset the wallet, close the dialog
      if (!willResetWallet) {
        onBack();
      }
      // If it will reset the wallet, the redirect will happen automatically
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete seed phrase"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackToSelect = () => {
    setStep("select");
    setPassword("");
    setError(null);
  };

  if (step === "select") {
    return (
      <DialogWrapper>
        <DialogHeader onClose={onBack} title="Delete Seed Phrase" />
        <DialogContent>
          <div className="space-y-4 w-full">
            <p className="text-sm text-gray-300">
              Select a seed phrase to delete. This action cannot be undone.
            </p>

            {seedPhrases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No seed phrases found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {seedPhrases.map((seedPhrase) => {
                  const accountCount = accounts.filter(
                    (acc) => acc.seedPhraseId === seedPhrase.id
                  ).length;

                  return (
                    <div
                      key={seedPhrase.id}
                      className="p-4 bg-[var(--card-color)] rounded-lg flex items-center justify-between w-full"
                    >
                      <div>
                        <h3 className="font-medium text-base text-white">
                          {seedPhrase.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {accountCount} account
                          {accountCount !== 1 ? "s" : ""} will be deleted
                        </p>
                      </div>
                      <IconButton
                        onClick={() => handleSelectSeedPhrase(seedPhrase.id)}
                        className="hover:bg-red-500/20 size-10"
                      >
                        <Trash2 className="size-5 text-red-500" />
                      </IconButton>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button onClick={onBack} className="w-full" variant="secondary">
            Cancel
          </Button>
        </DialogFooter>
      </DialogWrapper>
    );
  }

  return (
    <DialogWrapper>
      <DialogHeader onClose={handleBackToSelect} title="Confirm Deletion" />
      <DialogContent>
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-200">
              You are about to permanently delete the seed phrase{" "}
              <span className="font-bold">{selectedSeedPhrase?.name}</span>.
            </p>
            {relatedAccounts.length > 0 && (
              <p className="text-sm text-red-200 mt-2">
                This will also delete {relatedAccounts.length} account
                {relatedAccounts.length !== 1 ? "s" : ""}:
              </p>
            )}
            {relatedAccounts.length > 0 && (
              <ul className="text-sm text-red-200 mt-2 ml-4">
                {relatedAccounts.map((account) => (
                  <li key={account.id}>• {account.name}</li>
                ))}
              </ul>
            )}
            {willResetWallet && (
              <p className="text-sm text-red-200 mt-3 font-semibold">
                ⚠️ This will remove all your accounts and reset your entire
                wallet. You'll need to set up your wallet again.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Enter your password to confirm
            </label>
            <InputPassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleDelete();
                }
              }}
              hasError={!!error}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <div className="flex gap-3 w-full">
          <Button
            onClick={handleBackToSelect}
            className="flex-1"
            variant="secondary"
            disabled={isDeleting}
          >
            Back
          </Button>
          <Button
            onClick={handleDelete}
            className="flex-1"
            disabled={!password || isDeleting}
            variant="destructive"
          >
            Delete
          </Button>
        </div>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default DeleteSeedPhrase;
