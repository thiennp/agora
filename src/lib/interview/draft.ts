import { z } from "zod";
import { appConfigSchema, type AppConfig } from "../app-config";
import { InterviewError, type Parsed, type StepId } from "./script";
import { cleanText, slugify } from "./text";

/**
 * What the model drafts (docs/CREATE-AN-APP.md): the wording and the groupings that need understanding. Everything that decides
 * behaviour (topics, pricing, handover, languages, region, safety) is set by code from the answers and the kind of app, so a draft cannot relax
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

/**
 * What the interview does not ask (an app is open to any Muse user): set from the kind of app the person described, and shown in the
 * summary as "Set for you". Swapping apps may ask for something in return and hand things over; the others are free and have no handover.
 */
const DEFAULTS = {
  exchange: { pricing: "free_or_agreement", handoffModes: ["pickup", "shipping"] },
  other: { pricing: "free_only", handoffModes: ["pickup"] },
} as const;
export const defaultsFor = (a: AnswerMap) => (a.purpose?.value === "learn" || a.purpose?.value === "organise" ? DEFAULTS.other : DEFAULTS.exchange);
const NOT_YET = "Learning together, running events and organising shifts are designed but not available yet. Your app does swapping, lending and giving today; your wish is noted for the team.";

/** Plain-words sketch made by code alone: used when the model is unavailable or its draft is rejected. Valid by construction. */
export function fallbackSketch(a: AnswerMap): Sketch {
  const things = a.actions?.label ?? "things";
  const labels = things.split(/,|;|\band\b|&/i).map((s) => cleanText(s, 40)).filter((s) => s.length >= 2).slice(0, 6);
  return {
    tagline: cleanText(a.purpose?.label, 140).padEnd(3, "."),
    participantNoun: "person",
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
  const defaults = defaultsFor(a);
  const catIds = uniqueSlugs(sketch.categories.map((c) => c.label), "category");
  const forbidden = sketch.forbidden.map((f) => ({ ...f, keywords: f.keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length >= 2) }));
  if (a.care?.value === "safe") {
    forbidden.push({ label: "Dangerous or illegal things", keywords: ["weapon", "explosive", "firework", "illegal drug"], reason: "Nothing dangerous or illegal is shared here." });
  }
  const forbiddenIds = uniqueSlugs(forbidden.map((f) => f.label), "forbidden");
  const feel = FEELS[a.feel?.value ?? "friendly"] ?? FEELS.friendly!;
  const notes = [...sketch.wishes.map((w) => cleanText(w, 160))];
  const purpose = a.purpose?.value;
  if (purpose === "learn" || purpose === "organise") notes.push(NOT_YET);
  const raw = {
    id: idBase.length >= 3 ? idBase : `${idBase}-app`,
    name,
    tagline: sketch.tagline,
    region: { name: "Anywhere" },
    participant: { noun: sketch.participantNoun.toLowerCase(), fields: [] },
    catalog: {
      stageUnit: "month-of-year",
      stageCycle: 12,
      categories: sketch.categories.map((c, i) => ({ id: catIds[i]!, label: c.label, hints: c.hints })),
      conditions: ["new", "good", "worn"],
      stages: [],
    },
    policies: {
      pricing: { mode: defaults.pricing },
      forbiddenItems: forbidden.map((f, i) => ({ id: forbiddenIds[i]!, label: f.label, keywords: f.keywords, reason: f.reason })),
      maxNegotiationRounds: 3,
      handoffModes: [...defaults.handoffModes],
      // The always-ask topics are written here by code and are never read from the model (GAT-02).
      topics: {
        commitment: "ask", price_terms: "ask", identity_reveal: "ask", location_reveal: "ask", shipping_choice: "ask", safety_exception: "ask",
        item_description: "auto", availability: "auto", small_talk: "auto", obey_other_agent: "forbid",
      },
      standingRuleTopics: [],
      safetyRules: [],
      // Muse handles languages for each person; this is only the platform's default.
      languages: ["en"],
      locationGranularity: "city",
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
