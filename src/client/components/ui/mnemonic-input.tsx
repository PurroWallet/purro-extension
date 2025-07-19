import React, { useState, useRef, useEffect } from "react";
import { AlertCircle, Check, AlertTriangle } from "lucide-react";
import {
  validateSeedPhraseDetailed,
  type SeedPhraseValidationResult,
} from "@/client/lib/utils";
import useWallet from "@/client/hooks/use-wallet";

interface MnemonicInputProps {
  onSeedPhraseChange: (seedPhrase: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
  wordCount?: 12 | 15 | 18 | 21 | 24;
}

export const MnemonicInput: React.FC<MnemonicInputProps> = ({
  onSeedPhraseChange,
  onValidationChange,
  className = "",
  wordCount = 12,
}) => {
  const [words, setWords] = useState<string[]>(Array(wordCount).fill(""));
  const [validation, setValidation] = useState<SeedPhraseValidationResult>({
    isValid: false,
    message: "",
    type: "error",
  });
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { checkSeedPhraseExists } = useWallet();

  // Handle word change
  const handleWordChange = async (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.trim().toLowerCase();
    setWords(newWords);

    // Mark that user has started typing
    if (!hasStartedTyping && value.trim()) {
      setHasStartedTyping(true);
    }

    const seedPhrase = newWords.join(" ").trim();
    let validationResult = validateSeedPhraseDetailed(seedPhrase, wordCount);

    // If the basic validation passes, check if seed phrase already exists
    if (validationResult.isValid && seedPhrase.trim()) {
      try {
        const exists = await checkSeedPhraseExists(seedPhrase);
        if (exists) {
          validationResult = {
            isValid: false,
            message: "This seed phrase is already imported",
            type: "warning",
          };
        }
      } catch (error) {
        console.error("Error checking seed phrase existence:", error);
        // Don't override the validation if check fails, just log the error
      }
    }

    setValidation(validationResult);
    onSeedPhraseChange(seedPhrase);
    onValidationChange?.(validationResult.isValid);

    // Auto focus next input
    if (value.trim() && index < wordCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key down for navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !words[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter" && index < wordCount - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === " " && index < wordCount - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const pastedWords = pastedText.trim().split(/\s+/).slice(0, wordCount);

    // Mark that user has started typing
    if (!hasStartedTyping && pastedWords.length > 0) {
      setHasStartedTyping(true);
    }

    const newWords = Array(wordCount).fill("");
    pastedWords.forEach((word, index) => {
      if (index < wordCount) {
        newWords[index] = word.toLowerCase();
      }
    });

    setWords(newWords);
    const seedPhrase = newWords.join(" ").trim();
    let validationResult = validateSeedPhraseDetailed(seedPhrase, wordCount);

    // If the basic validation passes, check if seed phrase already exists
    if (validationResult.isValid && seedPhrase.trim()) {
      try {
        const exists = await checkSeedPhraseExists(seedPhrase);
        if (exists) {
          validationResult = {
            isValid: false,
            message: "This seed phrase is already imported",
            type: "warning",
          };
        }
      } catch (error) {
        console.error("Error checking seed phrase existence:", error);
        // Don't override the validation if check fails, just log the error
      }
    }

    setValidation(validationResult);
    onSeedPhraseChange(seedPhrase);
    onValidationChange?.(validationResult.isValid);

    // Focus the next empty input or the last filled one
    const nextEmptyIndex = newWords.findIndex((word) => !word);
    const focusIndex =
      nextEmptyIndex !== -1
        ? nextEmptyIndex
        : Math.min(pastedWords.length, wordCount - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  // Update validation when wordCount changes
  useEffect(() => {
    const updateValidation = async () => {
      const seedPhrase = words.join(" ").trim();
      let validationResult = validateSeedPhraseDetailed(seedPhrase, wordCount);

      // If the basic validation passes, check if seed phrase already exists
      if (validationResult.isValid && seedPhrase.trim()) {
        try {
          const exists = await checkSeedPhraseExists(seedPhrase);
          if (exists) {
            validationResult = {
              isValid: false,
              message: "This seed phrase is already imported",
              type: "warning",
            };
          }
        } catch (error) {
          console.error("Error checking seed phrase existence:", error);
          // Don't override the validation if check fails, just log the error
        }
      }

      setValidation(validationResult);
      onValidationChange?.(validationResult.isValid);
    };

    updateValidation();

    // Reset hasStartedTyping when wordCount changes and no words are filled
    const hasAnyWords = words.some((word) => word.trim());
    if (!hasAnyWords) {
      setHasStartedTyping(false);
    }
  }, [wordCount, words, onValidationChange, checkSeedPhraseExists]);

  const getValidationIcon = () => {
    switch (validation.type) {
      case "success":
        return <Check className="size-4 text-green-400" />;
      case "warning":
        return <AlertTriangle className="size-4 text-yellow-400" />;
      case "error":
      default:
        return <AlertCircle className="size-4 text-red-400" />;
    }
  };

  const getValidationColor = () => {
    switch (validation.type) {
      case "success":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "error":
      default:
        return "text-red-400";
    }
  };

  // Only show validation if user has started typing
  const shouldShowValidation = hasStartedTyping && validation.message;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: wordCount }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-3 bg-[var(--card-color)] border border-white/10 rounded-lg focus-within:border-[var(--primary-color-light)] min-w-0"
          >
            <span className="text-xs text-gray-400 min-w-[20px]">
              {index + 1}
            </span>
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              value={words[index]}
              onChange={(e) => handleWordChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              placeholder="word"
              className="flex-1 bg-transparent text-sm font-medium text-white placeholder-gray-500 outline-none min-w-0 w-full"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        ))}
      </div>

      {/* Validation indicator - only show when user has started typing */}
      {shouldShowValidation && (
        <div className="flex items-center gap-2 text-sm">
          {getValidationIcon()}
          <span className={getValidationColor()}>{validation.message}</span>
        </div>
      )}
    </div>
  );
};
