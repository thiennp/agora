import { districtDistanceKm } from "@/features/matching/public-api/infrastructure";

export const HANDOFF_MODES = ["pickup", "locker", "parcel_shop", "shipping"] as const;
export type HandoffMode = (typeof HANDOFF_MODES)[number];

export interface Window {
  from: string;
  to: string;
}

export interface Constraints {
  districtCode: string;
  availability: Window[];
  maxDistanceKm?: number;
  /** Modes this owner accepts; defaults to everything the app allows. */
  allowedModes?: HandoffMode[];
}

export interface Proposal {
  mode: HandoffMode;
  /** Agreed meeting window for in-person modes, when both sides have one. */
  window?: Window;
  reason: string;
}

/** Locker and shop first so home addresses stay hidden (LOG-HND-02), then pickup, then shipping. */
const PREFERENCE: HandoffMode[] = ["locker", "parcel_shop", "pickup", "shipping"];

/** First window where both owners are free, or undefined (LOG-HND-01). Empty availability means "no constraint". */
export function overlapWindow(a: Window[], b: Window[]): Window | undefined {
  if (a.length === 0 && b.length === 0) return undefined;
  if (a.length === 0) return b[0];
  if (b.length === 0) return a[0];
  for (const x of a) {
    for (const y of b) {
      const from = new Date(Math.max(+new Date(x.from), +new Date(y.from)));
      const to = new Date(Math.min(+new Date(x.to), +new Date(y.to)));
      if (from < to) return { from: from.toISOString(), to: to.toISOString() };
    }
  }
  return undefined;
}

/**
 * Pure proposal from both sides' constraints (LOG-HND-01): in-person modes need that both owners are within their distance
 * limits (a distance that cannot be known never satisfies a limit) and share a free window; shipping needs nothing but
 * being allowed by the app and both owners. Returns null when nothing fits, so owners are asked instead.
 */
export function proposeMode(appModes: readonly HandoffMode[], a: Constraints, b: Constraints): Proposal | null {
  const allowed = (m: HandoffMode) => appModes.includes(m) && (a.allowedModes ?? appModes).includes(m) && (b.allowedModes ?? appModes).includes(m);
  const km = districtDistanceKm(a.districtCode, b.districtCode);
  const limit = Math.min(a.maxDistanceKm ?? Infinity, b.maxDistanceKm ?? Infinity);
  const nearEnough = Number.isFinite(limit) ? km !== null && km <= limit : true;
  const window = overlapWindow(a.availability, b.availability);
  const needsWindow = a.availability.length > 0 || b.availability.length > 0;

  for (const mode of PREFERENCE) {
    if (!allowed(mode)) continue;
    if (mode === "shipping") return { mode, reason: "shipping suits both of you" };
    if (!nearEnough) continue;
    if (needsWindow && !window) continue;
    return { mode, window, reason: mode === "pickup" ? "you are close enough to meet" : "a public drop point keeps home places private" };
  }
  return null;
}

/** Short safety checklist shown with the handoff (LOG-HND-03). Logistics only, never health advice. */
export function checklistFor(mode: HandoffMode, extra: readonly string[] = []): string[] {
  const common = ["Check the item matches the listing before you take it.", "Share nothing personal beyond what this card shows."];
  const byMode: Record<HandoffMode, string[]> = {
    pickup: ["Meet in a well-lit place and let someone know where you are going.", "Keep to the agreed time window."],
    locker: ["Use the agreed locker or shop only; do not move the handover elsewhere.", "Keep your drop-off receipt until the item is collected."],
    parcel_shop: ["Use the agreed shop only; do not move the handover elsewhere.", "Keep your drop-off receipt until the item is collected."],
    shipping: ["Pack the item so it cannot break or leak.", "Keep the receipt and tracking number until delivery is confirmed."],
  };
  return [...byMode[mode], ...common, ...extra];
}
