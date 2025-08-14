import { cn } from '@/client/lib/utils';
import React, { useState, useRef, useEffect } from 'react';

interface HoldButtonProps {
  onConfirm: () => void;
  children?: React.ReactNode;
  className?: string;
  holdDuration?: number;
}

export const HoldButton = ({
  onConfirm,
  children = 'Hold to confirm',
  className,
  holdDuration = 1500, // Reduced from 2000ms to 1500ms
}: HoldButtonProps) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (isCompleted) return;

    setIsHolding(true);
    setProgress(0);

    // Start progress animation
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 100 / (holdDuration / 50);
        return Math.min(newProgress, 100);
      });
    }, 50);

    // Complete after hold duration
    holdTimeoutRef.current = setTimeout(() => {
      setIsCompleted(true);
      setProgress(100);
      setTimeout(() => {
        onConfirm();
      }, 100);
    }, holdDuration);
  };

  const stopHold = () => {
    if (isCompleted) return;

    setIsHolding(false);
    setProgress(0);

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative w-full">
      <button
        className={cn(
          'bg-[var(--button-color)] text-black px-4 py-3 rounded-lg text-base font-medium hover:bg-[var(--button-color)]/80 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden w-full',
          className
        )}
        onMouseDown={startHold}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={startHold}
        onTouchEnd={stopHold}
        disabled={isCompleted}
      >
        {/* Left-to-right progress fill */}
        <div
          className={`
            absolute left-0 top-0 h-full bg-[var(--primary-color)] rounded-lg transition-all duration-100 ease-out
            ${isHolding ? 'opacity-40' : 'opacity-0'}
          `}
          style={{
            width: `${progress}%`,
          }}
        />

        {/* Button text */}
        <span className="relative z-10">{children}</span>
      </button>
    </div>
  );
};
