/** Digits, with separators kept, in order of appearance: numbers, sizes, dates and times must survive translation (LNG-TRN-02). */
export const numbersIn = (t: string): string[] => (t.match(/\d+(?:[.,:/-]\d+)*/g) ?? []).map((n) => n.replace(",", "."));

export function numbersPreserved(source: string, translated: string): boolean {
  const a = numbersIn(source).sort();
  const b = numbersIn(translated).sort();
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

const words = (t: string) => new Set(t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

/** Word-overlap between a text and its round-trip (A to B to A), 0..1. A rough quality signal for the eval suite (LNG-TRN-03). */
export function roundTripSimilarity(original: string, back: string): number {
  const a = words(original);
  const b = words(back);
  if (a.size === 0 && b.size === 0) return 1;
  const inter = [...a].filter((w) => b.has(w)).length;
  return inter / new Set([...a, ...b]).size;
}
