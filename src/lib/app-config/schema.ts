import { z } from "zod";

/**
 * Topics every Agora app must route to the owner. An app may add topics but can never
 * relax these (GAT-02): the schema rejects any app config that marks one as "auto".
 */
export const ALWAYS_ASK_TOPICS = [
  "commitment",
  "price_terms",
  "identity_reveal",
  "location_reveal",
  "shipping_choice",
  "safety_exception",
] as const;

const slug = z.string().regex(/^[a-z][a-z0-9-]*$/);

const category = z.object({
  id: slug,
  label: z.string(),
  /** Free-text hints the labeling agent receives for this category. */
  hints: z.array(z.string()).default([]),
});

const stage = z.object({
  id: slug,
  label: z.string(),
  /**
   * Range in the app's own unit (see catalog.stageUnit). When `catalog.stageCycle` is set and `from > to`,
   * the range wraps past the end of the cycle (months 11 to 2 means Nov, Dec, Jan, Feb).
   */
  from: z.number().nonnegative(),
  to: z.number().nonnegative(),
  /** Category ids typically needed at this stage. */
  needs: z.array(slug).default([]),
  /** Category ids typically outgrown at the end of this stage. */
  outgrows: z.array(slug).default([]),
});

const forbiddenItem = z.object({
  id: slug,
  label: z.string(),
  /** Lower-case words or phrases; a listing containing one is blocked before it is listed or accepted. */
  keywords: z.array(z.string().min(2)).min(1),
  /** Plain-language reason shown to the owner. */
  reason: z.string(),
});

const safetyRule = z.object({
  id: slug,
  categories: z.array(slug).min(1),
  /** Missing information on `requires` makes the recommendation "decline" (SAF-03). */
  requires: z.array(z.string()).default([]),
  advice: z.string(),
});

export const appConfigSchema = z
  .object({
    id: slug,
    name: z.string(),
    tagline: z.string(),
    region: z.object({
      /** Where the app starts, in plain words ("Austin, TX"). Shown to owners and used to seed the sandbox city. */
      name: z.string(),
      /** ISO 3166-1 alpha-2, optional. */
      country: z.string().length(2).optional(),
    }),
    participant: z.object({
      /** What the platform calls an owner in this app's UI ("parent", "gardener", "student"). */
      noun: z.string(),
      /** Profile fields collected at onboarding, beyond language and district. */
      fields: z.array(z.object({ id: slug, label: z.string(), type: z.enum(["number", "text", "choice"]) })),
    }),
    catalog: z.object({
      stageUnit: z.string(),
      /** Length of a repeating cycle (12 for month-of-year). Leave out for linear stages such as age in months. */
      stageCycle: z.number().positive().optional(),
      /**
       * Participant field (type number) that says where the participant is in the stages, e.g. baby age in months.
       * Without it, a cyclic catalog uses the current month of the year (0 = January).
       */
      stageField: slug.optional(),
      categories: z.array(category).min(1),
      sizeSystems: z.record(z.array(z.string())).default({}),
      conditions: z.array(z.string()).min(1),
      stages: z.array(stage).default([]),
    }),
    policies: z.object({
      /** What owners may ask in return. The platform never holds money in any mode. */
      pricing: z.object({ mode: z.enum(["free_only", "swap_only", "free_or_agreement"]).default("free_or_agreement") }).default({}),
      /** Items that may never be listed or accepted in this app. */
      forbiddenItems: z.array(forbiddenItem).default([]),
      maxNegotiationRounds: z.number().int().min(1).max(10),
      handoffModes: z.array(z.enum(["pickup", "locker", "parcel_shop", "shipping"])).min(1),
      /** Gatekeeper outcome per topic. Always-ask topics must be "ask". */
      topics: z.record(z.enum(["auto", "ask", "forbid"])),
      /**
       * Extra lower-case words that make a message count as one of this app's topics (for topics the platform does not
       * know). Keywords can only add detection: they never override the platform's risk detection.
       */
      topicKeywords: z.record(z.array(z.string().min(2))).default({}),
      /** Topics owners may turn into standing rules. Never an always-ask topic. */
      standingRuleTopics: z.array(z.string()).default([]),
      safetyRules: z.array(safetyRule).default([]),
      languages: z.array(z.string().min(2)).min(1),
      /** Largest location detail ever stored before both owners confirm. */
      locationGranularity: z.enum(["district", "city"]).default("district"),
    }),
    theme: z.object({
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      radius: z.enum(["sharp", "soft", "round"]).default("soft"),
      font: z.string().optional(),
    }),
    simulation: z.object({
      /** Folder, relative to the app, holding the sandbox city (participants, personas). */
      cityDir: z.string(),
    }),
  })
  .superRefine((cfg, ctx) => {
    const always = new Set<string>(ALWAYS_ASK_TOPICS);
    for (const topic of ALWAYS_ASK_TOPICS) {
      if (cfg.policies.topics[topic] !== "ask") {
        ctx.addIssue({ code: "custom", path: ["policies", "topics", topic], message: `${topic} must be "ask"` });
      }
    }
    for (const topic of cfg.policies.standingRuleTopics) {
      if (always.has(topic) || cfg.policies.topics[topic] === undefined) {
        ctx.addIssue({ code: "custom", path: ["policies", "standingRuleTopics"], message: `invalid standing-rule topic ${topic}` });
      }
    }
    const cycle = cfg.catalog.stageCycle;
    cfg.catalog.stages.forEach((st, i) => {
      const path = ["catalog", "stages", i];
      if (cycle === undefined) {
        if (st.to <= st.from) ctx.addIssue({ code: "custom", path, message: "`to` must be greater than `from` (or set stageCycle to wrap)" });
      } else if (st.from >= cycle || st.to > cycle) {
        ctx.addIssue({ code: "custom", path, message: `stage values must be within the cycle (0..${cycle})` });
      } else if (st.from === st.to) {
        ctx.addIssue({ code: "custom", path, message: "`from` and `to` must differ" });
      }
    });
    for (const topic of Object.keys(cfg.policies.topicKeywords)) {
      if (cfg.policies.topics[topic] === undefined) {
        ctx.addIssue({ code: "custom", path: ["policies", "topicKeywords", topic], message: `keywords for unknown topic ${topic}` });
      }
    }
    const stageField = cfg.catalog.stageField;
    if (stageField && cfg.participant.fields.find((f) => f.id === stageField)?.type !== "number") {
      ctx.addIssue({ code: "custom", path: ["catalog", "stageField"], message: "stageField must name a number field" });
    }
    const categoryIds = new Set(cfg.catalog.categories.map((c) => c.id));
    const refs = [
      ...cfg.catalog.stages.flatMap((s) => [...s.needs, ...s.outgrows]),
      ...cfg.policies.safetyRules.flatMap((r) => r.categories),
    ];
    for (const ref of refs) {
      if (!categoryIds.has(ref)) {
        ctx.addIssue({ code: "custom", path: ["catalog"], message: `unknown category ${ref}` });
      }
    }
  });

export type AppConfig = z.infer<typeof appConfigSchema>;
