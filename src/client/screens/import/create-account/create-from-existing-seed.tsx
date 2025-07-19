import { Button } from "@/client/components/ui";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { SeedPhraseWithId } from "@/types";

interface CreateFromExistingSeedProps {
  onNext: () => void;
  accountsLength: number;
  seedPhrases: SeedPhraseWithId[];
}

const CreateFromExistingSeed = ({
  onNext,
  accountsLength,
  seedPhrases,
}: CreateFromExistingSeedProps) => {
  const {
    accountName,
    setAccountName,
    selectedSeedPhraseId,
    setSelectedSeedPhraseId,
  } = useCreateWalletStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Auto-select first seed phrase if not already selected and seed phrases exist
    if (seedPhrases.length > 0 && !selectedSeedPhraseId) {
      setSelectedSeedPhraseId(seedPhrases[0].id);
    }
  }, [seedPhrases, selectedSeedPhraseId, setSelectedSeedPhraseId]);

  const selectedSeedPhrase = seedPhrases.find(
    (sp) => sp.id === selectedSeedPhraseId
  );

  const canProceed = selectedSeedPhraseId && accountName && accountName.trim();

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">Create New Account</h1>
          <p className="text-base text-gray-500 text-center">
            Create a new account from your existing recovery phrase
          </p>
        </div>

        {/* Seed Phrase Selection - Only show if multiple seed phrases exist */}
        {seedPhrases.length > 1 && (
          <div className="flex flex-col gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white text-base flex items-center justify-between cursor-pointer"
              >
                <p className="text-base">Recovery Phrase</p>
                <div className="flex items-center gap-2">
                  {selectedSeedPhrase && (
                    <p className="text-base font-medium text-white/80">
                      {selectedSeedPhrase.name}
                    </p>
                  )}
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-[var(--card-color)] border border-white/10 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto w-fit">
                  {seedPhrases.map((seedPhrase) => (
                    <button
                      key={seedPhrase.id}
                      onClick={() => {
                        setSelectedSeedPhraseId(seedPhrase.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-end gap-3 py-3 px-10 hover:bg-white/5 transition-colors first:rounded-t-lg last:rounded-b-lg text-right cursor-pointer ${
                        selectedSeedPhraseId === seedPhrase.id
                          ? "bg-white/10"
                          : ""
                      }`}
                    >
                      <span className="text-white text-right text-base font-medium">
                        {seedPhrase.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show selected seed phrase when only one exists */}
        {seedPhrases.length === 1 && selectedSeedPhrase && (
          <div className="w-full px-4 py-3 border border-white/10 rounded-lg bg-[var(--card-color)] text-white text-base flex items-center justify-between gap-2">
            <p className="text-base">Recovery Phrase</p>
            <span className="text-base font-medium text-white/80">
              {selectedSeedPhrase.name}
            </span>
          </div>
        )}

        <input
          type="text"
          placeholder={`Account ${accountsLength + 1}`}
          value={accountName ?? ""}
          onChange={(e) => setAccountName(e.target.value)}
          className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white placeholder-gray-400 text-base"
        />
      </div>
      <Button className="w-full" disabled={!canProceed} onClick={onNext}>
        Next
      </Button>
    </div>
  );
};

export default CreateFromExistingSeed;
