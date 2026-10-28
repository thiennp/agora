import { twMerge } from "tailwind-merge";

type ClassValue = string | false | null | undefined;

/** Join class names, skip falsy values, and let later Tailwind utilities override earlier ones. */
export function cn(...parts: ClassValue[]): string {
  return twMerge(parts.filter(Boolean).join(" "));
}
