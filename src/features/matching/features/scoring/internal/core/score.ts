import type { AppConfig } from "@/lib/app-config";
import { distanceBand, type DistanceBand } from "./distance-band";

export interface ScoredItem {
  id: string;
  familyId: string;
  category: string;
  size?: string;
  condition?: string;
  createdAt: string;
}

export interface Factor {
  name: "category" | "size" | "condition" | "distance" | "timing" | "declined";
  points: number;
  max: number;
  note: string;
}

export interface Score {
  total: number;
  band: DistanceBand;
  factors: Factor[];
}

export interface ScoreContext {
  now: Date;
  distanceKm: number | null;
  /** Earlier declines of this pattern (same category, same counterpart). */
  declines: number;
}

type App = Pick<AppConfig, "catalog">;

/** Why a pair can never match, or null when it can. These are hard rules, not weights. */
export function incompatibility(app: App, offer: ScoredItem, want: ScoredItem): string | null {
  if (offer.category !== want.category) return "different category";
  if (offer.familyId === want.familyId) return "same owner";
  const sizes = app.catalog.sizeSystems[offer.category];
  if (sizes && offer.size && want.size) {
    const a = sizes.indexOf(offer.size);
    const b = sizes.indexOf(want.size);
    if (a >= 0 && b >= 0 && Math.abs(a - b) > 1) return "size too far apart";
  }
  if (want.condition && offer.condition) {
    const order = app.catalog.conditions;
    if (order.indexOf(offer.condition) > order.indexOf(want.condition)) return "condition below what the want accepts";
  }
  return null;
}

/**
 * Deterministic score from 0 to 100 with a breakdown for every factor (MAT-SCO-01, MAT-SCO-03).
 * Call `incompatibility` first; this assumes the pair is allowed.
 */
export function score(app: App, offer: ScoredItem, want: ScoredItem, ctx: ScoreContext): Score {
  const factors: Factor[] = [{ name: "category", points: 40, max: 40, note: `both are ${offer.category}` }];

  const sizes = app.catalog.sizeSystems[offer.category];
  if (sizes && offer.size && want.size) {
    const gap = Math.abs(sizes.indexOf(offer.size) - sizes.indexOf(want.size));
    factors.push({ name: "size", points: gap === 0 ? 20 : 10, max: 20, note: gap === 0 ? `size ${offer.size} matches` : `size ${offer.size} is one step from ${want.size}` });
  } else {
    factors.push({ name: "size", points: 10, max: 20, note: "size not compared" });
  }

  const order = app.catalog.conditions;
  const rank = offer.condition ? order.indexOf(offer.condition) : -1;
  const condPoints = rank < 0 ? 7 : Math.round((15 * (order.length - rank)) / order.length);
  factors.push({ name: "condition", points: condPoints, max: 15, note: offer.condition ? `${offer.condition} condition` : "condition not stated" });

  const band = distanceBand(ctx.distanceKm);
  const distPoints = { same: 20, near: 16, mid: 8, far: 2, unknown: 4 }[band];
  const km = ctx.distanceKm === null ? null : Math.round(ctx.distanceKm);
  factors.push({ name: "distance", points: distPoints, max: 20, note: band === "same" ? "same district" : km === null ? "distance unknown" : `about ${km} km away` });

  const ageDays = (ctx.now.getTime() - new Date(offer.createdAt).getTime()) / 86_400_000;
  factors.push({ name: "timing", points: ageDays < 7 ? 5 : ageDays < 30 ? 3 : 1, max: 5, note: ageDays < 7 ? "listed this week" : "listed a while ago" });

  if (ctx.declines > 0) {
    const penalty = Math.min(15, ctx.declines * 5);
    factors.push({ name: "declined", points: -penalty, max: 0, note: "similar match was declined before" });
  }

  const total = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)));
  return { total, band, factors };
}

/** One short line for the owner (MAT-02). */
export function reasonLine(s: Score): string {
  return s.factors
    .filter((f) => f.name !== "timing" && f.points >= 0)
    .map((f) => f.note)
    .join(", ")
    .replace(/^./, (c) => c.toUpperCase()) + ".";
}
