import { z } from "zod";
import { appConfigSchema, type AppConfig } from "../app-config";
import { InterviewError, type Parsed, type StepId } from "./script";
import { cleanText, slugify } from "./text";

/**
 * What the model drafts (docs/CREATE-AN-APP.md): the wording and the groupings that need understanding. Everything that decides
 * behaviour (topics, pricing, handover, languages, region, safety) is set by code from the tapped answers, so a draft cannot relax
 * an always-ask rule even if the model tried, and the finished config still goes through the app schema (`validateDraft`).
 */
export const sketchSchema = z.object({
  tagline: z.string().min(3).max(140),
  participantNoun: z.string().min(2).max(30),
  categories: z.array(z.object({ label: z.string().min(2).max(40), hints: z.array(z.string().min(2).max(30)).max(6).default([]) })).min(1).max(8),
  forbidden: z.array(z.object({ label: z.string().min(2).max(40), keywords: z.array(z.string().min(2).max(30)).min(1).max(8), reason: z.string().min(3).max(160) })).max(5).default([]),
  /** Things the person wanted that the platform cannot do yet, in plain words. */
  wishes: z.array(z.string().min(3).max(160)).max(4).default([]),
});
export type Sketch = z.infer<typeof sketchSchema>;

export type AnswerMap = Partial<Record<StepId, Parsed>>;

const FEELS: Record<string, { accent: string; radius: "sharp" | "soft" | "round" }> = {
  friendly: { accent: "#2f7a5b", radius: "soft" },
  serious: { accent: "#2b4a7a", radius: "sharp" },
  playful: { accent: "#c2417a", radius: "round" },
};

const HANDOVER = { meet: ["pickup"], drop: ["locker", "parcel_shop"], post: ["shipping"] } as const;
const PRICING = { free: "free_only", swap: "swap_only", agree: "free_or_agreement" } as const;
const NOT_YET = "Learning together and helping each other are designed but not available yet. Your app does swapping, lending and giving today; your wish is noted for the team.";

/** Plain-words sketch made by code alone: used when the model is unavailable or its draft is rejected. Valid by construction. */
export function fallbackSketch(a: AnswerMap): Sketch {
  const things = a.things?.label ?? "things";
  const labels = things.split(/,|;|\band\b|&/i).map((s) => cleanText(s, 40)).filter((s) => s.length >= 2).slice(0, 6);
  const people = cleanText(a.people?.label, 80) || "your community";
  return {
    tagline: cleanText(`For ${people}`, 140).padEnd(3, "."),
    participantNoun: "member",
    categories: (labels.length ? labels : ["Things"]).map((label) => ({ label, hints: [] })),
    forbidden: [],
    wishes: [],
  };
}

const uniqueSlugs = (labels: string[], fallback: string): string[] => {
  const seen = new Set<string>();
  return labels.map((l, i) => {
    const base = slugify(l, 30) || `${fallback}-${i + 1}`;
    let id = base;
    for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
    seen.add(id);
    return id;
  });
};

export interface Assembled {
  config: AppConfig;
  notes: string[];
}

/** The whole config from the answers and a sketch. Throws `invalid_draft` when the result fails the app schema. */
export function assemble(a: AnswerMap, sketch: Sketch): Assembled {
  const name = cleanText(a.name?.label, 40);
  const idBase = slugify(name) || "my-app";
  const place = a.place?.value ?? "online";
  const catIds = uniqueSlugs(sketch.categories.map((c) => c.label), "category");
  const forbidden = sketch.forbidden.map((f) => ({ ...f, keywords: f.keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length >= 2) }));
  if (a.care?.value === "safe") {
    forbidden.push({ label: "Dangerous or illegal things", keywords: ["weapon", "explosive", "firework", "illegal drug"], reason: "Nothing dangerous or illegal is shared here." });
  }
  const forbiddenIds = uniqueSlugs(forbidden.map((f) => f.label), "forbidden");
  const feel = FEELS[a.feel?.value ?? "friendly"] ?? FEELS.friendly!;
  const notes = [...sketch.wishes.map((w) => cleanText(w, 160))];
  const purpose = a.purpose?.value;
  if (purpose === "learn" || purpose === "help") notes.push(NOT_YET);
  const raw = {
    id: idBase.length >= 3 ? idBase : `${idBase}-app`,
    name,
    tagline: sketch.tagline,
    region: { name: place === "online" ? "Anywhere" : cleanText(a.placeName?.label, 80) || "Anywhere" },
    participant: { noun: sketch.participantNoun.toLowerCase(), fields: [] },
    catalog: {
      stageUnit: "month-of-year",
      stageCycle: 12,
      categories: sketch.categories.map((c, i) => ({ id: catIds[i]!, label: c.label, hints: c.hints })),
      conditions: ["new", "good", "worn"],
      stages: [],
    },
    policies: {
      pricing: { mode: PRICING[(a.pricing?.value ?? "agree") as keyof typeof PRICING] ?? "free_or_agreement" },
      forbiddenItems: forbidden.map((f, i) => ({ id: forbiddenIds[i]!, label: f.label, keywords: f.keywords, reason: f.reason })),
      maxNegotiationRounds: 3,
      handoffModes: [...(HANDOVER[(a.handover?.value ?? "meet") as keyof typeof HANDOVER] ?? ["pickup"])],
      // The always-ask topics are written here by code and are never read from the model (GAT-02).
      topics: {
        commitment: "ask", price_terms: "ask", identity_reveal: "ask", location_reveal: "ask", shipping_choice: "ask", safety_exception: "ask",
        item_description: "auto", availability: "auto", small_talk: "auto", obey_other_agent: "forbid",
      },
      standingRuleTopics: [],
      safetyRules: [],
      languages: a.languages?.codes?.length ? a.languages.codes : ["en"],
      locationGranularity: place === "city" || place === "online" ? "city" : "district",
    },
    theme: { accent: feel.accent, radius: feel.radius },
    simulation: { cityDir: "sandbox" },
  };
  return { config: validateDraft(raw), notes };
}

const ID = /^[a-z][a-z0-9-]{2,39}$/;

/** The one gate: a draft from anywhere (the model, the phone) becomes an app config only if the app schema accepts it. */
export function validateDraft(raw: unknown): AppConfig {
  const r = appConfigSchema.safeParse(raw);
  if (!r.success) throw new InterviewError("invalid_draft", r.error.issues.map((i) => `${i.path.join(".") || "app"}: ${i.message}`).join("; "));
  if (!ID.test(r.data.id)) throw new InterviewError("invalid_draft", "id: use 3 to 40 lowercase letters, digits or dashes, starting with a letter");
  return r.data;
}
