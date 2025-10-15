import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Check, AlertTriangle } from 'lucide-react';
import {
  validateSeedPhraseDetailed,
  type SeedPhraseValidationResult,
} from '@/client/lib/utils';
import useWallet from '@/client/hooks/use-wallet';

interface MnemonicInputProps {
  onSeedPhraseChange: (seedPhrase: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
  wordCount?: 12 | 15 | 18 | 21 | 24;
}

export const MnemonicInput: React.FC<MnemonicInputProps> = ({
  onSeedPhraseChange,
  onValidationChange,
  className = '',
  wordCount = 12,
}) => {
  const [words, setWords] = useState<string[]>(Array(wordCount).fill(''));
  const [validation, setValidation] = useState<SeedPhraseValidationResult>({
    isValid: false,
    message: '',
    type: 'error',
  });
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isHandlingNavigation = useRef(false);
  const { checkSeedPhraseExists } = useWallet();

  // Handle word change
  const handleWordChange = async (index: number, value: string) => {
    // Ignore changes during navigation
    if (isHandlingNavigation.current) {
      return;
    }

    // Remove spaces and convert to lowercase
    const cleanValue = value.replace(/\s+/g, '').toLowerCase();

    const newWords = [...words];
    newWords[index] = cleanValue;
    setWords(newWords);

    // Mark that user has started typing
    if (!hasStartedTyping && cleanValue) {
      setHasStartedTyping(true);
    }

    // Create seed phrase by joining non-empty words with spaces
    const filledWords = newWords.filter(w => w.length > 0);
    const seedPhrase = filledWords.join(' ');

    let validationResult = validateSeedPhraseDetailed(seedPhrase, wordCount);

    // If the basic validation passes, check if seed phrase already exists
    if (validationResult.isValid && seedPhrase) {
      try {
        const exists = await checkSeedPhraseExists(seedPhrase);
        if (exists) {
          validationResult = {
            isValid: false,
            message: 'This seed phrase is already imported',
            type: 'warning',
          };
        }
      } catch (error) {
        console.error('Error checking seed phrase existence:', error);
      }
    }

    setValidation(validationResult);
    // Only send valid seed phrases to parent, otherwise send empty string
    onSeedPhraseChange(validationResult.isValid ? seedPhrase : '');
    onValidationChange?.(validationResult.isValid);
  };

  // Handle key down for navigation
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      // If input is empty and backspace is pressed, go to previous input
      if (!e.currentTarget.value && index > 0) {
        e.preventDefault();
        isHandlingNavigation.current = true;
        inputRefs.current[index - 1]?.focus();
        // Reset flag after a short delay
        setTimeout(() => {
          isHandlingNavigation.current = false;
        }, 50);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      // Prevent default behavior (form submission, space character)
      e.preventDefault();

      // Move to next input if there's content and not at the last input
      const currentValue = words[index];
      if (currentValue && index < wordCount - 1) {
        isHandlingNavigation.current = true;
        inputRefs.current[index + 1]?.focus();
        // Reset flag after a short delay
        setTimeout(() => {
          isHandlingNavigation.current = false;
        }, 50);
      }
    }
  };

  // Handle paste
  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedWords = pastedText.trim().split(/\s+/).slice(0, wordCount);

    // Mark that user has started typing
    if (!hasStartedTyping && pastedWords.length > 0) {
      setHasStartedTyping(true);
    }

    const newWords = Array(wordCount).fill('');
    pastedWords.forEach((word, index) => {
      if (index < wordCount) {
        newWords[index] = word.toLowerCase();
      }
    });

    setWords(newWords);
    const filledWords = newWords.filter(w => w.length > 0);
    const seedPhrase = filledWords.join(' ');
    let validationResult = validateSeedPhraseDetailed(seedPhrase, wordCount);

    // If the basic validation passes, check if seed phrase already exists
    if (validationResult.isValid && seedPhrase) {
      try {
        const exists = await checkSeedPhraseExists(seedPhrase);
        if (exists) {
          validationResult = {
            isValid: false,
            message: 'This seed phrase is already imported',
            type: 'warning',
          };
        }
      } catch (error) {
        console.error('Error checking seed phrase existence:', error);
        // Don't override the validation if check fails, just log the error
      }
    }

    setValidation(validationResult);
    // Only send valid seed phrases to parent, otherwise send empty string
    onSeedPhraseChange(validationResult.isValid ? seedPhrase : '');
    onValidationChange?.(validationResult.isValid);

    // Focus the next empty input or the last filled one
    const nextEmptyIndex = newWords.findIndex(word => !word);
    const focusIndex =
      nextEmptyIndex !== -1
        ? nextEmptyIndex
        : Math.min(pastedWords.length, wordCount - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  // Update validation when wordCount changes
  useEffect(() => {
    const updateValidation = async () => {
      const filledWords = words.filter(w => w.length > 0);
      const seedPhrase = filledWords.join(' ');
      let validationResult = validateSeedPhraseDetailed(seedPhrase, wordCount);

      // If the basic validation passes, check if seed phrase already exists
      if (validationResult.isValid && seedPhrase) {
        try {
          const exists = await checkSeedPhraseExists(seedPhrase);
          if (exists) {
            validationResult = {
              isValid: false,
              message: 'This seed phrase is already imported',
              type: 'warning',
            };
          }
        } catch (error) {
          console.error('Error checking seed phrase existence:', error);
        }
      }

      setValidation(validationResult);
      // Only send valid seed phrases to parent, otherwise send empty string
      onSeedPhraseChange(validationResult.isValid ? seedPhrase : '');
      onValidationChange?.(validationResult.isValid);
    };

    updateValidation();

    // Reset hasStartedTyping when wordCount changes and no words are filled
    const hasAnyWords = words.some(word => word.length > 0);
    if (!hasAnyWords) {
      setHasStartedTyping(false);
    }
  }, [
    wordCount,
    words,
    onValidationChange,
    onSeedPhraseChange,
    checkSeedPhraseExists,
  ]);

  const getValidationIcon = () => {
    switch (validation.type) {
      case 'success':
        return <Check className="size-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="size-4 text-yellow-400" />;
      case 'error':
      default:
        return <AlertCircle className="size-4 text-red-400" />;
    }
  };

  const getValidationColor = () => {
    switch (validation.type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
      default:
        return 'text-red-400';
    }
  };

  // Only show validation if user has started typing
  const shouldShowValidation = hasStartedTyping && validation.message;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <form
        onSubmit={e => {
          e.preventDefault();
          return false;
        }}
        autoComplete="off"
      >
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
                ref={el => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                value={words[index]}
                onChange={e => handleWordChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                placeholder="word"
                className="flex-1 bg-transparent text-sm font-medium text-white placeholder-gray-500 outline-none min-w-0 w-full"
                autoComplete="new-password"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                name={`word-${index}`}
                id={`seed-word-${index}`}
                inputMode="text"
              />
            </div>
          ))}
        </div>
      </form>

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
