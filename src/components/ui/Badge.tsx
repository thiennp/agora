import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export type BadgeTone = "brand" | "neutral" | "success" | "warning" | "danger" | "info";

const SOFT: Record<BadgeTone, string> = {
  brand: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100",
  neutral: "bg-surface-2 text-muted ring-1 ring-inset ring-line",
  success: "bg-ok-soft text-ok",
  warning: "bg-warn-soft text-warn",
  danger: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

const SOLID: Record<BadgeTone, string> = {
  brand: "bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950",
  neutral: "bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900",
  success: "bg-green-600 text-white dark:bg-green-400 dark:text-green-950",
  warning: "bg-amber-500 text-amber-950",
  danger: "bg-red-600 text-white dark:bg-red-400 dark:text-red-950",
  info: "bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  solid?: boolean;
  size?: "sm" | "md";
  before?: ReactNode;
  after?: ReactNode;
}

/** A short status label. The tone sets colour only; always put the meaning in the text too. */
export function Badge({ tone = "brand", solid = false, size = "md", before, after, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-caption" : "px-2.5 py-1 text-small",
        solid ? SOLID[tone] : SOFT[tone],
        className,
      )}
      {...rest}
    >
      {before}
      {children}
      {after}
    </span>
  );
}
