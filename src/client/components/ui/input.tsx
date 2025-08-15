import { cn } from '@/client/lib/utils';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowLeftRight } from 'lucide-react';

export const Input = ({
  type,
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  hasError = false,
  disabled = false,
  min,
  max,
  step,
}: {
  type: 'text' | 'number';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) => {
  return (
    <motion.input
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      className={cn(
        'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-[var(--card-color)] text-white placeholder-gray-400 text-base transition-colors duration-200',
        hasError
          ? 'border-red-500 focus:ring-red-500'
          : 'border-white/10 focus:ring-[var(--primary-color-light)]',
        className
      )}
      animate={
        hasError
          ? {
              x: [0, -10, 10, -10, 10, 0],
            }
          : {}
      }
      transition={{
        duration: 0.5,
        ease: 'easeInOut',
      }}
    />
  );
};

export const InputPassword = ({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Password',
  className,
  hasError = false,
  showToggle = true,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  showToggle?: boolean;
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative w-full">
      <motion.input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-[var(--card-color)] text-white placeholder-gray-400 text-base transition-colors duration-200',
          showToggle ? 'pr-12' : 'pr-4',
          hasError
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/10 focus:ring-[var(--primary-color-light)]',
          className
        )}
        animate={
          hasError
            ? {
                x: [0, -10, 10, -10, 10, 0],
              }
            : {}
        }
        transition={{
          duration: 0.5,
          ease: 'easeInOut',
        }}
      />

      {showToggle && (
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );
};

export const InputCurrency = ({
  value,
  onChange,
  onKeyDown,
  placeholder = '0.00',
  className,
  hasError = false,
  currency = 'USD',
  decimals = 2,
  maxValue,
  onMaxClick,
  onSwitchCurrency,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  currency?: string;
  decimals?: number;
  maxValue?: string;
  onMaxClick?: () => void;
  onSwitchCurrency?: () => void;
}) => {
  const [focused, setFocused] = useState(false);

  const formatValue = (val: string) => {
    // Convert comma to dot for decimal separator
    let cleanValue = val.replace(/,/g, '.');

    // Remove all non-numeric characters except decimal point
    cleanValue = cleanValue.replace(/[^\d.]/g, '');

    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places
    if (parts[1] && parts[1].length > decimals) {
      return parts[0] + '.' + parts[1].substring(0, decimals);
    }

    return cleanValue;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatValue(e.target.value);
    e.target.value = formattedValue;
    onChange(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point (both . and ,), arrow keys
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      '.',
      ',',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }

    // Allow special keys
    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow numbers
    if (/^[0-9]$/.test(e.key)) {
      return;
    }

    // Block everything else
    e.preventDefault();

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const displayValue = (() => {
    if (focused || !value) {
      return value;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return value; // Return original value if not a valid number
    }

    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  })();

  const handleMaxClick = () => {
    if (onMaxClick) {
      onMaxClick();
    } else if (maxValue) {
      const event = {
        target: { value: maxValue },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };

  return (
    <div className="relative w-full">
      <motion.input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-4 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-[var(--card-color)] text-white placeholder-gray-400 text-base transition-colors duration-200',
          onMaxClick && onSwitchCurrency
            ? 'pr-32'
            : onMaxClick
              ? 'pr-24'
              : onSwitchCurrency
                ? 'pr-20'
                : 'pr-16',
          hasError
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/10 focus:ring-[var(--primary-color-light)]',
          className
        )}
        animate={
          hasError
            ? {
                x: [0, -10, 10, -10, 10, 0],
              }
            : {}
        }
        transition={{
          duration: 0.5,
          ease: 'easeInOut',
        }}
      />

      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
        {onSwitchCurrency ? (
          <button
            type="button"
            onClick={onSwitchCurrency}
            className="text-sm font-medium text-gray-400 flex items-center gap-1 hover:text-[var(--primary-color)] transition-colors duration-200 focus:outline-none"
          >
            <ArrowLeftRight className="size-4" />
            {currency}
          </button>
        ) : (
          <span className="text-sm font-medium text-gray-400">{currency}</span>
        )}
        {onMaxClick && (
          <button
            type="button"
            onClick={handleMaxClick}
            className="px-2 py-1 text-xs font-medium text-[var(--primary-color)] bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 rounded transition-colors duration-200 focus:outline-none"
          >
            MAX
          </button>
        )}
      </div>
    </div>
  );
};
