import { type ClassValue, clsx } from "clsx";
import { ethers } from "ethers";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function validateSeedPhrase(seedPhrase: string): boolean {
    if (!seedPhrase || typeof seedPhrase !== 'string') {
        return false;
    }
    const words = seedPhrase.trim().split(/\s+/);
    return [12, 15, 18, 21, 24].includes(words.length);
}

export interface SeedPhraseValidationResult {
    isValid: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export function validateSeedPhraseDetailed(seedPhrase: string, expectedWordCount?: number): SeedPhraseValidationResult {
    if (!seedPhrase || !seedPhrase.trim()) {
        return {
            isValid: false,
            message: 'Please enter your seed phrase',
            type: 'error'
        };
    }

    const words = seedPhrase.trim().split(/\s+/);
    const wordCount = words.length;

    // Check word count
    if (expectedWordCount && wordCount !== expectedWordCount) {
        if (wordCount < expectedWordCount) {
            return {
                isValid: false,
                message: `Please enter all ${expectedWordCount} words (${wordCount}/${expectedWordCount})`,
                type: 'warning'
            };
        } else {
            return {
                isValid: false,
                message: `Too many words. Expected ${expectedWordCount}, got ${wordCount}`,
                type: 'error'
            };
        }
    }

    // Check if word count is valid
    if (![12, 15, 18, 21, 24].includes(wordCount)) {
        return {
            isValid: false,
            message: `Invalid word count. Must be 12, 15, 18, 21, or 24 words`,
            type: 'error'
        };
    }

    // Check for empty words
    const emptyWords = words.some(word => !word.trim());
    if (emptyWords) {
        return {
            isValid: false,
            message: 'All words must be filled',
            type: 'error'
        };
    }

    // Check for duplicate words
    const uniqueWords = new Set(words);
    if (uniqueWords.size !== words.length) {
        return {
            isValid: false,
            message: 'Duplicate words found in seed phrase',
            type: 'error'
        };
    }

    // If we have the expected word count and all words are filled
    if (expectedWordCount && wordCount === expectedWordCount) {
        return {
            isValid: true,
            message: 'Valid seed phrase',
            type: 'success'
        };
    }

    return {
        isValid: true,
        message: 'Valid seed phrase format',
        type: 'success'
    };
}

export const openSidePanel = async () => {
    if (chrome.sidePanel && chrome.sidePanel.open) {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab.id) {
            await chrome.sidePanel.open({ tabId: tab.id });
            window.close();
        }
    }
};

export const generateMnemonic = (strength = 128) => {
    try {
        const entropy = ethers.randomBytes(strength / 8);
        const mnemonicObj = ethers.Mnemonic.fromEntropy(entropy);
        return mnemonicObj.phrase;
    } catch (error) {
        console.error("Error generating mnemonic:", error);
    }
};
