import type { FindingKind } from "@/features/trust/public-api/types";

export interface RelayMessage {
  id: string;
  dealId: string;
  fromFamilyId: string;
  toFamilyId: string;
  /** Exactly what the sender typed. Kept in memory for the sender's own view only; the database keeps its hash and the screened text. */
  original: string;
  originalLang: string;
  /** The original after screening: safe to show the other owner. */
  screenedOriginal: string;
  /** What the other owner reads, in their language. Empty when blocked. */
  relayed: string;
  relayedLang: string;
  status: "delivered" | "redacted" | "blocked";
  /** Plain-words reason shown to the sender when something was removed or blocked. */
  senderNotice: string | null;
  screening: { decision: "allow" | "redact" | "block"; kinds: FindingKind[] };
  /** Gatekeeper topics found, so the receiver can be told that chat cannot change the deal. */
  topics: string[];
  chatDoesNotChangeTerms: boolean;
  uncertain: boolean;
  translationFailed: boolean;
  /** SHA-256 of `original`, kept for evidence. */
  hash: string;
  at: string;
}

/** One message as one owner sees it (NEG-REL-04). */
export type RelayView =
  | { id: string; direction: "sent"; at: string; original: string; status: RelayMessage["status"]; notice: string | null; deliveredAs: string }
  | { id: string; direction: "received"; at: string; text: string; textLang: string; originalFromSender: string; originalLang: string; uncertain: boolean; translationFailed: boolean; notice: string | null };
