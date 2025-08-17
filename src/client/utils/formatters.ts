import { ethers } from 'ethers';

export const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getTimeColor = (timeLeft: number) => {
  if (timeLeft <= 60) return 'text-red-400'; // Last minute - red
  if (timeLeft <= 300) return 'text-yellow-400'; // Last 5 minutes - yellow
  return 'text-white/60'; // Normal - gray
};

export function formatCurrency(
  value: number | undefined,
  decimals = 2,
  currency = '$',
  isNegative = true
): string {
  if (value === undefined || isNaN(value)) {
    return `${currency}0.00`;
  }

  // Use absolute value for formatting to avoid double negative signs
  const absValue = Math.abs(value);
  const formattedValue = absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (value < 0) {
    return `${isNegative ? '-' : ''}${currency}${formattedValue}`;
  }

  if (currency !== '$') return `${formattedValue} ${currency}`;

  return `${currency}${formattedValue}`;
}

export const formatBigAmount = (value: string): string => {
  const num = parseFloat(value);
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(2)}B`;
  } else if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
};

export const convertToWeiHex = (amount: string) => {
  const weiValue = ethers.parseEther(amount.toString());
  return '0x' + weiValue.toString(16);
};

export const hexToNumber = (hexValue: string) => {
  return parseInt(hexValue, 16);
};

// Format token amounts with appropriate decimal places and K/M/B suffixes
export const formatTokenAmount = (
  value: string | number,
  maxDecimals = 6
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || num === 0) {
    return '0';
  }

  // For very large numbers, use K/M/B notation
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }

  // For smaller numbers, show appropriate decimal places
  if (num >= 1) {
    // For numbers >= 1, limit to reasonable decimal places
    const decimals = Math.min(maxDecimals, 4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  } else if (num >= 0.01) {
    // For numbers >= 0.01, show up to 4 decimal places
    return num.toFixed(4).replace(/\.?0+$/, '');
  } else if (num >= 0.0001) {
    // For very small numbers, show up to 6 decimal places
    return num.toFixed(6).replace(/\.?0+$/, '');
  } else {
    // For extremely small numbers, use scientific notation
    return num.toExponential(3);
  }
};
