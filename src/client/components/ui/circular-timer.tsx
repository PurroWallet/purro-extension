import React from 'react';
import { cn } from '@/client/lib/utils';

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  timeLeft,
  totalTime,
  isActive,
  size = 24,
  strokeWidth = 2,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = isActive ? timeLeft / totalTime : 1;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-1000 ease-linear',
            isActive ? 'text-[var(--primary-color-light)]' : 'text-white/40'
          )}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'text-xs font-mono font-medium',
            isActive ? 'text-[var(--primary-color-light)]' : 'text-white/60'
          )}
        >
          {isActive ? timeLeft : ''}
        </span>
      </div>
    </div>
  );
};
