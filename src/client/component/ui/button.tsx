import React from "react";
import { cn } from "@/client/lib/utils";

export const Button = ({
  children,
  onClick,
  className,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "destructive";
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-lg text-base transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium",
        variant === "primary" &&
          "bg-[var(--button-color)] hover:bg-[var(--primary-color-light)]/80 text-black",
        variant === "secondary" &&
          "bg-[var(--button-color-secondary)] hover:bg-[var(--button-color-secondary)]/80 text-white",
        variant === "destructive" &&
          "bg-[var(--button-color-destructive)] hover:bg-[var(--button-color-destructive)]/80 text-black",
        className
      )}
    >
      {children}
    </button>
  );
};

export const IconButton = ({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-full hover:bg-[var(--card-color)]/80 size-8 transition-all cursor-pointer flex justify-center items-center",
        className
      )}
    >
      {children}
    </button>
  );
};
