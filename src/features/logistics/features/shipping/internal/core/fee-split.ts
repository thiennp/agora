export interface FeeSplit {
  /** Whole percents; they add up to 100. */
  senderPct: number;
  recipientPct: number;
  note?: string;
}

/**
 * The agreed fee split is recorded as terms only; money moves between the owners or through the carrier, never through the
 * platform (LOG-SHP-03, LOG-04). There is deliberately no amount, currency or payment field here.
 */
export function validateFeeSplit(input: unknown): FeeSplit {
  const s = input as Partial<FeeSplit> | null;
  const ok = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 100;
  if (!s || !ok(s.senderPct) || !ok(s.recipientPct) || s.senderPct + s.recipientPct !== 100) {
    throw new Error("a fee split is two whole percentages that add up to 100");
  }
  return { senderPct: s.senderPct, recipientPct: s.recipientPct, note: typeof s.note === "string" ? s.note.slice(0, 200) : undefined };
}
