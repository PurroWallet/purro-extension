import { ethers } from 'ethers';

// Helper function to format transaction value
export const formatValue = (value: string): string => {
    const ethValue = parseFloat(value) / Math.pow(10, 18);
    return parseFloat(ethValue.toFixed(6)).toString();
};

// Helper function to format token amount based on decimals
export const formatTokenAmount = (amount: string, decimals: number = 18): string => {
    try {
        // Use ethers.formatUnits to handle very large numbers properly
        const ethersFormatted = ethers.formatUnits(amount, decimals);

        // For very large numbers, avoid parseFloat and work with strings
        const decimalIndex = ethersFormatted.indexOf('.');
        const integerPart =
            decimalIndex >= 0
                ? ethersFormatted.substring(0, decimalIndex)
                : ethersFormatted;
        const integerLength = integerPart.length;

        // Handle very large numbers (more than 15 digits) differently
        if (integerLength > 15) {
            // For extremely large numbers, show a simplified format
            const firstFewDigits = integerPart.substring(0, 3);
            const exponent = integerLength - 1;
            const result = `${firstFewDigits.charAt(0)}.${firstFewDigits.substring(1)}e+${exponent}`;
            return result;
        }

        // For smaller numbers, use parseFloat safely
        const formattedAmount = parseFloat(ethersFormatted);

        // Format based on size and remove trailing zeros
        if (formattedAmount === 0) return '0';
        if (formattedAmount < 0.0001) return formattedAmount.toExponential(2);
        if (formattedAmount < 1)
            return parseFloat(formattedAmount.toFixed(6)).toString();
        if (formattedAmount < 1000)
            return parseFloat(formattedAmount.toFixed(4)).toString();
        if (formattedAmount < 1000000)
            return parseFloat((formattedAmount / 1000).toFixed(2)).toString() + 'K';

        const finalResult =
            parseFloat((formattedAmount / 1000000).toFixed(2)).toString() + 'M';
        return finalResult;
    } catch (error) {
        console.error('formatTokenAmount - Error:', error);
        return '0';
    }
};

// Helper function to format transaction time
export const formatTransactionTime = (timestamp: string): string => {
    return new Date(parseInt(timestamp) * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Helper function to format transaction date
export const formatTransactionDate = (timestamp: string): string => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}; 