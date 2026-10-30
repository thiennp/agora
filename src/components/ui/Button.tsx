import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold no-underline " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-soft hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 dark:text-brand-950",
  secondary: "bg-brand-100 text-brand-800 hover:bg-brand-200 dark:bg-brand-900 dark:text-brand-100 dark:hover:bg-brand-800",
  outline: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 dark:text-red-950",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-small",
  md: "h-11 px-4 text-body",
  lg: "h-12 px-6 text-body",
};

/** Class string for anything that should look like a button, for example a `next/link` anchor. */
function buttonClass(opts: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}): string {
  const { variant = "primary", size = "md", fullWidth, className } = opts;
  return cn(BASE, VARIANT[variant], SIZE[size], fullWidth && "w-full", className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  before?: ReactNode;
  after?: ReactNode;
}

export function Button({ variant, size, fullWidth, loading, before, after, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Spinner /> : before}
      {children}
      {after}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
