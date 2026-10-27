import { z } from "zod";
import type { AppConfig } from "@/lib/app-config";
import type { Gatekeeper } from "@/features/gatekeeper/public-api/types";
import type { NegotiationMandate } from "@/features/negotiation/public-api/types";
import type { MandateRecord, MandateStore, OwnerLimits } from "../infrastructure/mandate.repository";
import { isEligible } from "./standing-rule-eligibility";

export class MandateRuleError extends Error {
  constructor(readonly code: "not_eligible" | "not_found" | "invalid_limits", message: string) {
    super(message);
  }
}

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

type App = Pick<AppConfig, "catalog" | "policies">;

/** Standing rules (low-risk, expiring, one per topic) and hard limits for each owner (OWN-MND-01..03). */
export function createMandateBook(deps: {
  app: App;
  gatekeeper: Gatekeeper;
  store: MandateStore;
  now?: () => Date;
  newId?: () => string;
}) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const terms = deps.app.policies.pricing.mode === "free_only" ? ["free"] : deps.app.policies.pricing.mode === "swap_only" ? ["swap"] : ["free", "swap", "price"];

  const limitsSchema = z
    .object({
      maxDistanceKm: z.number().min(0.5).max(100).optional(),
      blockedCategories: z.array(z.enum(deps.app.catalog.categories.map((c) => c.id) as [string, ...string[]])).default([]),
      availability: z.array(z.object({ from: z.string().datetime(), to: z.string().datetime() }).refine((w) => new Date(w.from) < new Date(w.to))).default([]),
      minCondition: z.enum(deps.app.catalog.conditions as [string, ...string[]]).optional(),
      allowedTerms: z.array(z.enum(terms as [string, ...string[]])).min(1).default(["free"].filter((t) => terms.includes(t)).length ? ["free"] : [terms[0]!]),
    })
    .strict();

  const live = (m: MandateRecord) => new Date(m.expiresAt) > now();

  return {
    /** Create or replace a standing rule. Throws for any topic that may not be automated (always-ask, forbidden, not in the app's list). */
    add(input: { familyId: string; topic: string; days?: number; source?: "owner" | "learned_with_consent" }): MandateRecord {
      if (!isEligible(deps.app, input.topic)) throw new MandateRuleError("not_eligible", `${input.topic} cannot be a standing rule`);
      const days = Math.min(Math.max(input.days ?? DEFAULT_DAYS, 1), MAX_DAYS);
      const expiresAt = new Date(now().getTime() + days * 86_400_000).toISOString();
      for (const old of deps.store.forFamily(input.familyId).filter((m) => m.topic === input.topic)) deps.store.mandates.delete(old.id);
      deps.gatekeeper.revokeMandates(input.familyId, input.topic);
      deps.gatekeeper.addMandate({ familyId: input.familyId, topic: input.topic, level: "auto", expiresAt }); // the gatekeeper re-checks eligibility
      const rec: MandateRecord = { id: newId(), familyId: input.familyId, topic: input.topic, expiresAt, source: input.source ?? "owner", createdAt: now().toISOString() };
      deps.store.mandates.set(rec.id, rec);
      return rec;
    },
    /** Every live rule in one place (OWN-MND-03). */
    list: (familyId: string) => deps.store.forFamily(familyId).filter(live),
    /** Takes effect immediately (OWN-04). */
    revoke(familyId: string, id: string): void {
      const m = deps.store.mandates.get(id);
      if (!m || m.familyId !== familyId) throw new MandateRuleError("not_found", "rule not found");
      deps.store.mandates.delete(id);
      deps.gatekeeper.revokeMandates(familyId, m.topic);
    },
    eraseFamily(familyId: string) {
      for (const m of deps.store.forFamily(familyId)) deps.store.mandates.delete(m.id);
      deps.gatekeeper.revokeMandates(familyId);
      deps.store.limits.delete(familyId);
    },

    setLimits(familyId: string, input: unknown): OwnerLimits {
      const r = limitsSchema.safeParse(input);
      if (!r.success) throw new MandateRuleError("invalid_limits", r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      const limits = r.data as OwnerLimits;
      deps.store.limits.set(familyId, limits);
      return limits;
    },
    getLimits: (familyId: string): OwnerLimits => deps.store.limits.get(familyId) ?? { blockedCategories: [], availability: [], allowedTerms: [terms.includes("free") ? "free" : (terms[0] as "swap")] },

    /** Adapter for matching's hard limits (OWN-MND-01). */
    limitsOf(familyId: string) {
      const l = this.getLimits(familyId);
      return { maxDistanceKm: l.maxDistanceKm, blockedCategories: l.blockedCategories };
    },
    /** Adapter for negotiation: the owner's limits become the agent's mandate. */
    negotiationMandate(familyId: string, language: string, opening?: NegotiationMandate["opening"]): NegotiationMandate {
      const l = this.getLimits(familyId);
      return { allowedTerms: l.allowedTerms, minCondition: l.minCondition, availability: l.availability, language, opening };
    },
  };
}

export type MandateBook = ReturnType<typeof createMandateBook>;
