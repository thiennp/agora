import { numbersPreserved } from "@/features/language/public-api/infrastructure";

/**
 * Faithfulness checks on a translated message (NEG-REL-02). The relay never rewrites meaning: it either delivers a
 * translation that passes these checks or delivers the original and says translation was not possible.
 */
export function isFaithful(source: string, translated: string): boolean {
  if (!translated.trim()) return false;
  if (!numbersPreserved(source, translated)) return false;
  // Wildly different length means something was added or dropped.
  const ratio = translated.length / Math.max(source.length, 1);
  return source.length < 12 || (ratio >= 0.3 && ratio <= 3.5);
}
