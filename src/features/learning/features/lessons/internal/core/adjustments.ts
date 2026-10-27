import type { Lesson } from "../../../../../memory/public-api/types";
import { ACTS_FROM } from "./confidence";

/**
 * What lessons may change. Deliberately only three things, all of which can only make an owner's own limits stricter:
 * a smaller distance, a higher condition floor, exact sizes. There is no field for topics, terms or commitments, so a lesson
 * can never relax an always-ask topic (LRN-04).
 */
export interface Adjustments {
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

/** Adjustments from confident decline lessons only (seen at least twice). */
export function deriveAdjustments(lessons: readonly Lesson[]): Adjustments {
  const sure = lessons.filter((l) => l.kind === "decline" && l.confidence >= ACTS_FROM);
  const reason = (l: Lesson) => l.key.split(":")[1];
  const adj: Adjustments = { strictSizeCategories: [] };
  if (sure.some((l) => reason(l) === "too_far")) adj.distanceFactor = 0.7;
  if (sure.some((l) => reason(l) === "condition")) adj.raiseConditionFloor = true;
  adj.strictSizeCategories = [...new Set(sure.filter((l) => reason(l) === "wrong_size").map((l) => l.key.split(":")[2]!).filter((c) => c !== "any"))];
  return adj;
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
