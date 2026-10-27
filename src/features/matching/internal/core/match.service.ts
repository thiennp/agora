import type { AppConfig } from "@/lib/app-config";
import { createCandidateIndex, districtKeys } from "../../features/candidates/public-api/infrastructure";
import type { IndexedItem } from "../../features/candidates/public-api/types";
import { districtDistanceKm, incompatibility, reasonLine, score } from "../../features/scoring/public-api/infrastructure";
import type { DistanceBand, Factor } from "../../features/scoring/public-api/types";

export interface Match {
  /** "<offerItemId>:<wantItemId>", stable so a dismissal sticks. */
  id: string;
  offerItemId: string;
  wantItemId: string;
  score: number;
  distanceBand: DistanceBand;
  /** Distance between the two districts in km, or null when it cannot be known. */
  distanceKm: number | null;
  reason: string;
  factors: Factor[];
}

export interface MatchResult {
  matches: Match[];
  /** Plain-language explanation and next step when there is nothing to show (MAT-04). */
  emptyReason?: string;
}

export interface OwnerLimits {
  maxDistanceKm?: number;
  blockedCategories?: string[];
  /** Categories where only the exact size matches (learned from "wrong size" declines). */
  strictSizeCategories?: string[];
}

type App = Pick<AppConfig, "id" | "catalog">;

const DEFAULT_RADIUS_KM = 15;

export function createMatchService(deps: {
  app: App;
  limitsOf?: (familyId: string) => OwnerLimits;
  now?: () => Date;
  topN?: number;
}) {
  const now = deps.now ?? (() => new Date());
  const topN = deps.topN ?? 3;
  const index = createCandidateIndex();
  const dismissed = new Map<string, Set<string>>();
  const declines = new Map<string, number>();
  const patternKey = (category: string, a: string, b: string) => `${category}|${[a, b].sort().join("~")}`;

  function empty(item: IndexedItem, why: string): MatchResult {
    const other = item.kind === "offer" ? "looking for" : "offering";
    return {
      matches: [],
      emptyReason: `${why} Nobody nearby is ${other} this yet. Check back soon, or ${item.kind === "offer" ? "widen how far you will go" : "add other things you would take"}.`.trim(),
    };
  }

  return {
    /** Keep the index in step with the catalog: call when an item is listed or its details change. */
    onListed(item: IndexedItem) {
      index.add(item);
    },
    /** Call when an item is withdrawn, reserved, done, or its owner withdraws consent. */
    onUnlisted(itemId: string) {
      index.remove(itemId);
    },
    rebuild(items: IndexedItem[]) {
      index.clear();
      items.forEach((i) => index.add(i));
    },

    /** Best few counterparts for an item, with a reason each (MAT-01, MAT-02). */
    candidatesFor(item: IndexedItem, opts?: { limits?: OwnerLimits }): MatchResult {
      // `opts.limits` replaces the item owner's own limits for this call only (used to look beyond a learned limit with the owner's approval).
      const mine = opts?.limits ?? deps.limitsOf?.(item.familyId) ?? {};
      if (mine.blockedCategories?.includes(item.category)) {
        return { matches: [], emptyReason: "You have chosen not to trade this category." };
      }
      const radius = Math.min(mine.maxDistanceKm ?? DEFAULT_RADIUS_KM, DEFAULT_RADIUS_KM);
      const found = index.query({
        appId: deps.app.id,
        kind: item.kind === "offer" ? "want" : "offer",
        category: item.category,
        districtKeys: districtKeys(item.districtCode, radius),
      });

      const matches: Match[] = [];
      for (const other of found) {
        const offer = item.kind === "offer" ? item : other;
        const want = item.kind === "want" ? item : other;
        if (incompatibility(deps.app, offer, want)) continue;
        const theirs = deps.limitsOf?.(other.familyId) ?? {};
        if (theirs.blockedCategories?.includes(item.category)) continue;
        const strict = mine.strictSizeCategories?.includes(item.category) || theirs.strictSizeCategories?.includes(item.category);
        if (strict && item.size && other.size && item.size !== other.size) continue;

        const km = districtDistanceKm(item.districtCode, other.districtCode);
        // Hard distance limits (MAT-CAN-02): the stricter owner wins; unknown distance cannot prove it is within a limit.
        const limit = Math.min(mine.maxDistanceKm ?? Infinity, theirs.maxDistanceKm ?? Infinity);
        if (Number.isFinite(limit) && (km === null || km > limit)) continue;

        const id = `${offer.id}:${want.id}`;
        if (dismissed.get(item.familyId)?.has(id) || dismissed.get(other.familyId)?.has(id)) continue;

        const s = score(deps.app, offer, want, {
          now: now(),
          distanceKm: km,
          declines: declines.get(patternKey(item.category, item.familyId, other.familyId)) ?? 0,
        });
        matches.push({ id, offerItemId: offer.id, wantItemId: want.id, score: s.total, distanceBand: s.band, distanceKm: km, reason: reasonLine(s), factors: s.factors });
      }

      matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
      const top = matches.slice(0, topN);
      return top.length ? { matches: top } : empty(item, found.length ? "Nobody listed fits your limits." : "");
    },

    /** The owner never wants to see this pair again (MAT-03); it also counts as a decline of the pattern. */
    dismiss(familyId: string, match: Match, otherFamilyId: string, category: string) {
      const set = dismissed.get(familyId) ?? new Set<string>();
      set.add(match.id);
      dismissed.set(familyId, set);
      this.recordDecline(familyId, otherFamilyId, category);
    },
    recordDecline(familyId: string, otherFamilyId: string, category: string) {
      const k = patternKey(category, familyId, otherFamilyId);
      declines.set(k, (declines.get(k) ?? 0) + 1);
    },
    erase(familyId: string) {
      dismissed.delete(familyId);
    },
  };
}

export type MatchService = ReturnType<typeof createMatchService>;
