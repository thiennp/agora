import type { Lesson } from "../../../../../memory/public-api/types";
import { ACTS_FROM } from "./confidence";

/**
 * What lessons may change. Deliberately only three things, all of which can only make an owner's own limits stricter:
 * a smaller distance, a higher condition floor, exact sizes. There is no field for topics, terms or commitments, so a lesson
 * can never relax an always-ask topic (LRN-04).
 */
interface Adjustments {
  distanceFactor?: number;
  raiseConditionFloor?: boolean;
  strictSizeCategories: string[];
}

export interface Limits {
  maxDistanceKm?: number;
  minCondition?: string;
  strictSizeCategories?: string[];
}

const DEFAULT_DISTANCE_CAP_KM = 10;
const MIN_DISTANCE_KM = 1;

/**
 * Adjustments from decline lessons, net of stretch evidence. For each decline lesson (reason and category) the effective count is
 * its declines minus twice the stretch deals the owner approved and confirmed for the same reason and category. From 2 the limit
 * is tightened fully; at 1 (it was tightened and then relaxed once) half a step; at 0 or below not at all. So an owner who keeps
 * accepting stretched deals loosens the limit back towards their own base, and new declines tighten it again. The result can only
 * be as strict as the full tightening and never looser than the owner's own base limits (LRN-04, LRN-06).
 */
export function deriveAdjustments(lessons: readonly Lesson[]): Adjustments {
  const stretch = new Map<string, number>();
  for (const l of lessons) {
    if (l.kind !== "stretch") continue;
    const [, reason, cat] = l.key.split(":");
    stretch.set(`${reason}:${cat}`, (stretch.get(`${reason}:${cat}`) ?? 0) + l.count);
  }
  const adj: Adjustments = { strictSizeCategories: [] };
  let factor: number | undefined;
  for (const l of lessons) {
    if (l.kind !== "decline" || l.confidence < ACTS_FROM) continue;
    const [, reason, cat] = l.key.split(":");
    const net = l.count - 2 * (stretch.get(`${reason}:${cat}`) ?? 0);
    if (net < 1) continue;
    const full = net >= 2;
    if (reason === "too_far") factor = Math.min(factor ?? 1, full ? 0.7 : 0.85);
    if (reason === "condition" && full) adj.raiseConditionFloor = true;
    if (reason === "wrong_size" && full && cat && cat !== "any" && !adj.strictSizeCategories.includes(cat)) adj.strictSizeCategories.push(cat);
  }
  if (factor !== undefined) adj.distanceFactor = factor;
  adj.strictSizeCategories.sort();
  return adj;
}

export type StretchReason = "too_far" | "condition" | "wrong_size";

interface StretchFacts {
  category: string;
  distanceKm: number | null;
  offerCondition?: string;
  offerSize?: string;
  wantSize?: string;
}

/** How far beyond a learned limit a candidate may be and still be worth asking about (LRN-10): 30% on distance, one step on condition. */
const STRETCH_DISTANCE_MARGIN = 1.3;

/**
 * Which learned limits (and only those) keep this candidate out, when the candidate is close enough to the limit to be worth asking
 * about. Empty means the owner's own base limits exclude it, it is not excluded at all, or it is too far beyond the learned limit for
 * a question to be fair, so it is not a stretch (LRN-09, LRN-10).
 */
export function blockedByLearned(
  base: Limits,
  learned: Limits,
  conditions: readonly string[],
  f: StretchFacts,
  /** Widen the margins (any distance beyond the learned limit, any condition step) for experiments; the product uses the defaults. */
  opts: { distanceMargin?: number; anyConditionStep?: boolean } = {},
): StretchReason[] {
  const out: StretchReason[] = [];
  if (learned.maxDistanceKm !== undefined && f.distanceKm !== null && f.distanceKm > learned.maxDistanceKm && f.distanceKm <= learned.maxDistanceKm * (opts.distanceMargin ?? STRETCH_DISTANCE_MARGIN) && (base.maxDistanceKm === undefined || f.distanceKm <= base.maxDistanceKm)) {
    out.push("too_far");
  }
  if (learned.minCondition !== undefined && f.offerCondition) {
    const learnedFloor = conditions.indexOf(learned.minCondition);
    const baseFloor = base.minCondition ? conditions.indexOf(base.minCondition) : conditions.length - 1;
    const got = conditions.indexOf(f.offerCondition);
    if ((opts.anyConditionStep ? got > learnedFloor : got === learnedFloor + 1) && got <= baseFloor) out.push("condition");
  }
  if (learned.strictSizeCategories?.includes(f.category) && !base.strictSizeCategories?.includes(f.category) && f.offerSize && f.wantSize && f.offerSize !== f.wantSize) {
    out.push("wrong_size");
  }
  return out;
}

/** Apply adjustments to limits. The result is never looser than the base (tighten-only). `conditions` is best first. */
export function tighten(base: Limits, adj: Adjustments, conditions: readonly string[]): Limits {
  const out: Limits = { ...base, strictSizeCategories: [...new Set([...(base.strictSizeCategories ?? []), ...adj.strictSizeCategories])] };
  if (adj.distanceFactor !== undefined) {
    const cur = base.maxDistanceKm ?? DEFAULT_DISTANCE_CAP_KM;
    out.maxDistanceKm = Math.min(cur, Math.max(MIN_DISTANCE_KM, Math.round(cur * adj.distanceFactor * 10) / 10));
  }
  if (adj.raiseConditionFloor && conditions.length > 0) {
    const idx = base.minCondition ? conditions.indexOf(base.minCondition) : -1;
    const cur = idx < 0 ? conditions.length - 1 : idx;
    out.minCondition = conditions[Math.max(0, cur - 1)];
  }
  return out;
}
