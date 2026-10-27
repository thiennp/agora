import type { AppConfig } from "@/lib/app-config";
import { hashSeed, pick, rng } from "../../../city/public-api/infrastructure";
import type { Style } from "../../../city/public-api/types";

/**
 * What a simulated owner will actually accept. The agents, the matcher and the learning slice never see these values; they can
 * only discover them from declines (SIM-OWN-01). Ground truth for measuring whether learning helps.
 */
export interface HiddenRules {
  maxDistanceKm: number;
  /** Worst condition the owner accepts as a receiver. */
  minCondition: string;
  /** As a receiver, only the exact size will do. */
  exactSize: boolean;
}

export type Reason = "too_far" | "condition" | "wrong_size";
export interface Facts {
  distanceKm: number | null;
  offerCondition?: string;
  offerSize?: string;
  wantSize?: string;
}
export type Verdict = { confirm: true } | { confirm: false; reason: Reason };

type App = Pick<AppConfig, "catalog">;

/** Rules by personality, with seeded variation. Strict owners exist so a first round of generic proposals gets declined. */
export function deriveHiddenRules(app: App, familyId: string, style: Style, seed: number): HiddenRules {
  const r = rng(hashSeed("hidden", seed, familyId));
  const c = app.catalog.conditions;
  const worst = c.at(-1)!;
  const good = c.includes("good") ? "good" : c[Math.max(0, c.length - 2)]!;
  const strict = c.includes("like-new") ? "like-new" : good;
  switch (style) {
    case "generous":
      return { maxDistanceKm: pick(r, [8, 12]), minCondition: worst, exactSize: false };
    case "brief":
      return { maxDistanceKm: pick(r, [5, 8, 12]), minCondition: r() < 0.5 ? good : worst, exactSize: r() < 0.25 };
    case "chatty":
      return { maxDistanceKm: pick(r, [5, 8]), minCondition: r() < 0.6 ? good : worst, exactSize: r() < 0.4 };
    case "price-sensitive":
      return { maxDistanceKm: pick(r, [3, 5]), minCondition: r() < 0.7 ? good : strict, exactSize: r() < 0.6 };
  }
}

/** One owner's decision on one proposed deal. A receiver cares about condition and size; everyone cares about distance (SIM-OWN-02). */
export function judge(app: App, rules: HiddenRules, role: "giver" | "receiver", f: Facts): Verdict {
  if (f.distanceKm !== null && f.distanceKm > rules.maxDistanceKm) return { confirm: false, reason: "too_far" };
  if (role === "receiver") {
    const order = app.catalog.conditions;
    if (f.offerCondition && order.indexOf(f.offerCondition) > order.indexOf(rules.minCondition)) return { confirm: false, reason: "condition" };
    if (rules.exactSize && f.offerSize && f.wantSize && f.offerSize !== f.wantSize) return { confirm: false, reason: "wrong_size" };
  }
  return { confirm: true };
}

/**
 * A simulated owner shown a stretch card sees only the facts the card shows (the distance, the condition, whether the size fits) and
 * says yes if those are fine by their own rules, as a real owner would judge from the same card. They do not know what the other
 * owner will decide.
 */
export function acceptsStretch(app: App, rules: HiddenRules, reasons: readonly Reason[], f: Facts): boolean {
  return judge(app, rules, "receiver", {
    distanceKm: reasons.includes("too_far") ? f.distanceKm : null,
    offerCondition: reasons.includes("condition") ? f.offerCondition : undefined,
    offerSize: reasons.includes("wrong_size") ? f.offerSize : undefined,
    wantSize: reasons.includes("wrong_size") ? f.wantSize : undefined,
  }).confirm;
}

/** Would both owners accept this pair? Used as the ground truth for match relevance. */
export const acceptableToBoth = (app: App, giver: HiddenRules, receiver: HiddenRules, f: Facts): boolean =>
  judge(app, giver, "giver", f).confirm && judge(app, receiver, "receiver", f).confirm;
