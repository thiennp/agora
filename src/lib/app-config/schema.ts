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
  /** Participant age or level range, in the app's own unit (see catalog.stageUnit). */
  from: z.number().nonnegative(),
  to: z.number().positive(),
  /** Category ids typically needed at this stage. */
  needs: z.array(slug).default([]),
  /** Category ids typically outgrown at the end of this stage. */
  outgrows: z.array(slug).default([]),
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
    participant: z.object({
      /** What the platform calls an owner in this app's UI ("parent", "gardener", "student"). */
      noun: z.string(),
      /** Profile fields collected at onboarding, beyond language and district. */
      fields: z.array(z.object({ id: slug, label: z.string(), type: z.enum(["number", "text", "choice"]) })),
    }),
    catalog: z.object({
      stageUnit: z.string(),
      categories: z.array(category).min(1),
      sizeSystems: z.record(z.array(z.string())).default({}),
      conditions: z.array(z.string()).min(1),
      stages: z.array(stage).default([]),
    }),
    policies: z.object({
      maxNegotiationRounds: z.number().int().min(1).max(10),
      handoffModes: z.array(z.enum(["pickup", "locker", "parcel_shop", "shipping"])).min(1),
      /** Gatekeeper outcome per topic. Always-ask topics must be "ask". */
      topics: z.record(z.enum(["auto", "ask", "forbid"])),
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
