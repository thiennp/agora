import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "warn" | "bad" | "info";

/** A small label. The tone is never the only signal: the text always says what it means. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge${tone === "neutral" ? "" : ` ${tone}`}`}>{children}</span>;
}
