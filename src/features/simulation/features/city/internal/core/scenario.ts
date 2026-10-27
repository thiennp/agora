import type { AppConfig } from "@/lib/app-config";
import type { City, SimFamily } from "./persona.schema";
import { hashSeed, pick, rng } from "./rng";

export interface ItemSpec {
  category: string;
  size?: string;
  condition?: string;
}
export interface FamilyScenario {
  familyId: string;
  offer: ItemSpec;
  want: ItemSpec;
}

/** Offer condition mix: mostly good or worn, so owners with standards decline some matches. */
const CONDITION_WEIGHTS = [0.05, 0.2, 0.4, 0.35];

type App = Pick<AppConfig, "catalog">;

function condition(r: () => number, conditions: readonly string[]): string {
  const x = r();
  let acc = 0;
  for (const [i, w] of CONDITION_WEIGHTS.entries()) {
    acc += w;
    if (x < acc && conditions[i]) return conditions[i]!;
  }
  return conditions.at(-1)!;
}

/**
 * Fresh offers and wants for every family in one episode (SIM-CTY-02). `scenarioKey` makes training and held-out scenarios
 * different by construction: they never share a key, so a held-out scenario is never one a lesson was learned from (SIM-03).
 */
export function generateScenario(app: App, city: City, scenarioKey: string, seed: number): FamilyScenario[] {
  return city.families.map((f: SimFamily): FamilyScenario => {
    const r = rng(hashSeed("scenario", seed, scenarioKey, f.id));
    const sizes = (c: string) => app.catalog.sizeSystems[c];
    const wantSizes = sizes(f.wantCategory);
    const offerSizes = sizes(f.offerCategory);
    const own = typeof f.profile.sizes === "string" ? f.profile.sizes : undefined;
    const base = wantSizes && own ? Math.max(0, wantSizes.indexOf(own)) : 0;
    return {
      familyId: f.id,
      want: { category: f.wantCategory, ...(wantSizes ? { size: wantSizes[base] } : {}) },
      offer: {
        category: f.offerCategory,
        ...(offerSizes ? { size: offerSizes[Math.min(offerSizes.length - 1, Math.max(0, base + Math.floor(r() * 5) - 2))] } : {}),
        condition: condition(r, app.catalog.conditions),
      },
    };
  });
}
