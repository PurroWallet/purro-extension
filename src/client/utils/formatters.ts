import { ethers } from "ethers";

export const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const getTimeColor = (timeLeft: number) => {
  if (timeLeft <= 60) return "text-red-400"; // Last minute - red
  if (timeLeft <= 300) return "text-yellow-400"; // Last 5 minutes - yellow
  return "text-white/60"; // Normal - gray
};

export function formatCurrency(
  value: number | undefined,
  decimals = 2,
  currency = "$",
  isNegative = true
): string {
  if (value === undefined || isNaN(value)) {
    return `${currency}0.00`;
  }

  // Use absolute value for formatting to avoid double negative signs
  const absValue = Math.abs(value);
  const formattedValue = absValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (value < 0) {
    return `${isNegative ? "-" : ""}${currency}${formattedValue}`;
  }

  if(currency !== "$") return `${formattedValue} ${currency}`

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
  return "0x" + weiValue.toString(16);
};

export const hexToNumber = (hexValue: string) => {
  return parseInt(hexValue, 16);
};
