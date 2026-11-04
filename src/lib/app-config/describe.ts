import { ALWAYS_ASK_TOPICS, type AppConfig } from "./schema";

const PRICING = { free_only: "Everything is free.", swap_only: "Things are swapped, not sold.", free_or_agreement: "Things are free, or people agree something in return." } as const;
const HANDOFF = { pickup: "pick-up", locker: "locker", parcel_shop: "parcel shop", shipping: "shipping" } as const;
const TOPIC = {
  commitment: "committing to anything", price_terms: "a price or terms", identity_reveal: "sharing who you are", location_reveal: "sharing where you are",
  shipping_choice: "how things are handed over", safety_exception: "any safety exception",
} as const;

/**
 * What the app's matching is shaped like. The platform's only matching machinery is exchange-shaped (offers, wants, deals, handover), so an
 * app that is free, pick-up only and so has nothing to swap or ship is described as a board: plain posts of what one person offers or
 * needs, and replies between two people's agents. Decided from the config alone, so the words never claim more than the app is set up for.
 */
export type AppStyle = "exchange" | "board";
export const appStyle = (app: AppConfig): AppStyle =>
  app.policies.pricing.mode === "free_only" && app.policies.handoffModes.every((m) => m === "pickup") ? "board" : "exchange";

export interface AppDescription {
  /** What the app is for, in the app's own words. */
  purpose: string;
  /** What people can do here. */
  features: string[];
  /** What every person using the app can rely on. Fixed platform rules come last and cannot be relaxed by the app. */
  rules: string[];
  /** What the app does not do, said plainly so nobody expects more than is built. */
  limits: string[];
}

/** Plain-language name, purpose, features and rules of an app, derived from its validated config; shown on the public page, the overview and the agent page (BR-42). Reads config only, never member data. */
export function describeApp(app: AppConfig): AppDescription {
  const p = app.policies;
  const board = appStyle(app) === "board";
  const things = app.catalog.categories.map((c) => c.label.charAt(0).toLowerCase() + c.label.slice(1)).join(", ");
  const features = board
    ? [
        `Post what you offer or what you need, under: ${things}.`,
        "Your own agent looks for posts that fit yours and talks to the other person's agent for you.",
        "Answer your agent's questions and confirm things with your own tap; you can then message the other person through your agent.",
      ]
    : [
        `Share and find: ${things}.`,
        `Your own agent works for you in ${p.languages.join(", ")}.`,
        `Handover by ${p.handoffModes.map((m) => HANDOFF[m]).join(", ")}.`,
      ];
  const rules = [
    ...(board ? [] : [PRICING[p.pricing.mode]]),
    ...p.ownerRules,
    ...(p.forbiddenItems.length ? [`Not allowed: ${p.forbiddenItems.map((f) => f.label.toLowerCase()).join(", ")}.`] : []),
    `Your agent always asks you first before ${ALWAYS_ASK_TOPICS.map((t) => TOPIC[t]).join(", ")}.`,
    ...(app.region.name !== "Anywhere" ? [`Only your ${p.locationGranularity} is stored until both sides agree to share more.`] : []),
    "Messages between people using the app go through agents, which screen, translate and skip what is not relevant to you.",
    "No money moves through this app, and it gives no medical, legal or developmental advice.",
  ];
  const limits = [
    board
      ? "It matches what one person offers with what another person needs, one conversation at a time. It has no events, calendar, sign-up or RSVP lists, group chat, or announcements to everyone."
      : "It matches what one person offers with what another person needs, one deal at a time. It has no group features such as events or sign-up lists.",
    "Translation is simulated for now, and so are shipping labels: no carrier is booked.",
  ];
  return { purpose: app.tagline, features, rules, limits };
}
