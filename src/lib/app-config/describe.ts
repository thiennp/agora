import { ALWAYS_ASK_TOPICS, type AppConfig } from "./schema";

const PRICING = { free_only: "Everything is free.", swap_only: "Things are swapped, not sold.", free_or_agreement: "Things are free, or people agree something in return." } as const;
const HANDOFF = { pickup: "pick-up", locker: "locker", parcel_shop: "parcel shop", shipping: "shipping" } as const;
const TOPIC = {
  commitment: "committing to anything", price_terms: "a price or terms", identity_reveal: "sharing who you are", location_reveal: "sharing where you are",
  shipping_choice: "how things are handed over", safety_exception: "any safety exception",
} as const;

export interface AppDescription {
  /** What the app is for and who joins, in the app's own words. */
  purpose: string;
  /** What members can do here. */
  features: string[];
  /** What every member can rely on. Fixed platform rules come last and cannot be relaxed by the app. */
  rules: string[];
}

/** Plain-language name, purpose, features and rules of an app, derived from its validated config; shown on the join page and the overview (BR-42). Reads config only, never member data. */
export function describeApp(app: AppConfig): AppDescription {
  const p = app.policies;
  const features = [
    `Share and find: ${app.catalog.categories.map((c) => c.label.toLowerCase()).join(", ")}.`,
    `Your own agent works for you in ${p.languages.join(", ")}.`,
    `Handover by ${p.handoffModes.map((m) => HANDOFF[m]).join(", ")}.`,
  ];
  const rules = [
    PRICING[p.pricing.mode],
    ...(p.forbiddenItems.length ? [`Not allowed: ${p.forbiddenItems.map((f) => f.label.toLowerCase()).join(", ")}.`] : []),
    `Your agent always asks you first before ${ALWAYS_ASK_TOPICS.map((t) => TOPIC[t]).join(", ")}.`,
    `Only your ${p.locationGranularity} is stored until both sides agree to share more.`,
    "Messages between members go through agents, which screen, translate and skip what is not relevant to you.",
    "No money moves through this app, and it gives no medical, legal or developmental advice.",
  ];
  return { purpose: app.tagline, features, rules };
}
