import { z } from "zod";
import type { AppConfig } from "@/lib/app-config";
import { classify } from "@/features/gatekeeper/public-api/infrastructure";

export const TERMS = ["free", "swap", "price"] as const;
export type Terms = (typeof TERMS)[number];

type App = Pick<AppConfig, "catalog" | "policies">;

/** Which terms the app allows, from its pricing mode. The platform never moves money; a price is agreed between owners. */
export function allowedTerms(app: Pick<AppConfig, "policies">): Terms[] {
  const mode = app.policies.pricing.mode;
  return mode === "free_only" ? ["free"] : mode === "swap_only" ? ["swap"] : ["free", "swap", "price"];
}

const window = z
  .object({ from: z.string().datetime(), to: z.string().datetime() })
  .strict()
  .refine((w) => new Date(w.from) < new Date(w.to), { message: "pickup window must end after it starts" });

/**
 * Structured offer (NEG-OFR-01, NEG-02): language-neutral fields plus a short note. Built per app so terms and
 * conditions follow the app config.
 */
export function buildOfferSchema(app: App) {
  const terms = allowedTerms(app) as [Terms, ...Terms[]];
  const conditions = app.catalog.conditions as [string, ...string[]];
  return z
    .object({
      itemId: z.string().min(1),
      terms: z.enum(terms),
      price: z.object({ amount: z.number().positive().max(100_000), currency: z.string().length(3) }).strict().optional(),
      swapFor: z.string().trim().min(1).max(120).optional(),
      condition: z.enum(conditions).optional(),
      pickupWindow: window.optional(),
      note: z.string().trim().max(280).default(""),
    })
    .strict()
    .superRefine((o, ctx) => {
      if (o.terms === "price" && !o.price) ctx.addIssue({ code: "custom", path: ["price"], message: "price terms need a price" });
      if (o.terms === "swap" && !o.swapFor) ctx.addIssue({ code: "custom", path: ["swapFor"], message: "swap terms need to say what for" });
      if (o.terms !== "price" && o.price) ctx.addIssue({ code: "custom", path: ["price"], message: "only price terms carry a price" });
      if (o.terms !== "swap" && o.swapFor) ctx.addIssue({ code: "custom", path: ["swapFor"], message: "only swap terms say what for" });
    });
}

export type Offer = z.infer<ReturnType<typeof buildOfferSchema>>;

/**
 * An outgoing note must read as harmless: if the classifier finds anything other than benign topics (a price, an
 * address, a contact detail, an instruction) the note is rejected, whoever wrote it.
 */
export function noteIsHarmless(app: Pick<AppConfig, "policies">, note: string): boolean {
  if (!note.trim()) return true;
  const { topics } = classify(app.policies, note);
  return topics.length === 0 || topics.every((t) => app.policies.topics[t] === "auto");
}
