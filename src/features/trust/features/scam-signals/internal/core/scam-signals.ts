import type { FindingKind } from "../../../screening/public-api/types";

export type SignalId = "off_platform_payment" | "contact_leak" | "pressure" | "address_harvesting" | "listing_mismatch" | "repeated_cancellations";

export interface Signal {
  id: SignalId;
  weight: number;
  /** Short plain-words explanation shown to the owner (TRU-SIG-02). */
  explanation: string;
}

export interface SignalReport {
  score: number;
  level: "none" | "watch" | "high";
  signals: Signal[];
}

export interface SignalInput {
  /** The sender's messages in the conversation, with what screening found in each. */
  messages: { text: string; kinds: readonly FindingKind[] }[];
  /** Times this agent cancelled a deal after agreeing. */
  cancellations?: number;
  /** Set by intake when a photo does not match the listing. */
  listingMismatch?: boolean;
}

const PRESSURE = /\b(urgent(?:ly)?|right now|immediately|asap|last chance|only today|hurry|before someone else|don'?t tell|dringend|sofort|jetzt gleich|urgente|ya mismo|ahora mismo|gấp|ngay bây giờ)\b/gi;
const HARVEST = /\b(?:your|ur) (?:home |full |exact )?(?:address|name|phone|number)\b|\bwhere do you live\b|\bwhat'?s your (?:address|name)\b|\bdeine (?:adresse|nummer)\b|\btu (?:dirección|teléfono)\b|\bđịa chỉ (?:của )?(?:bạn|nhà)\b/gi;

/** Pure scoring of scam patterns (TRU-SIG-01, 02). One weak signal stays below "high" (TRU-SIG-03). */
export function scoreSignals(input: SignalInput): SignalReport {
  const signals: Signal[] = [];
  const kinds = input.messages.flatMap((m) => m.kinds);
  const text = input.messages.map((m) => m.text);

  if (kinds.includes("payment")) {
    signals.push({ id: "off_platform_payment", weight: 35, explanation: "Asked for payment in advance or by an outside service. The platform never handles money." });
  }
  const leaks = kinds.filter((k) => k === "phone" || k === "email" || k === "handle" || k === "link").length;
  if (leaks > 0) {
    signals.push({ id: "contact_leak", weight: leaks >= 3 ? 25 : 10, explanation: `Tried to share contact details or links ${leaks} time${leaks > 1 ? "s" : ""}, which were removed.` });
  }
  const pressureHits = new Set(text.flatMap((t) => [...t.matchAll(PRESSURE)].map((m) => m[0].toLowerCase()))).size;
  if (pressureHits > 0) {
    signals.push({ id: "pressure", weight: Math.min(30, 15 * pressureHits), explanation: "Used pressure to rush a decision." });
  }
  if (text.some((t) => HARVEST.test(t)) || kinds.includes("address")) {
    signals.push({ id: "address_harvesting", weight: 25, explanation: "Asked for personal details such as an address, name or phone number." });
  }
  if (input.listingMismatch) {
    signals.push({ id: "listing_mismatch", weight: 25, explanation: "The item in the photos does not match the listing." });
  }
  const c = input.cancellations ?? 0;
  if (c >= 3) signals.push({ id: "repeated_cancellations", weight: c >= 5 ? 30 : 20, explanation: `Cancelled ${c} deals after agreeing.` });

  const score = Math.min(100, signals.reduce((s, x) => s + x.weight, 0));
  return { score, level: score >= 50 ? "high" : score >= 20 ? "watch" : "none", signals };
}
