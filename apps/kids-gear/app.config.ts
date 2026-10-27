import { defineApp } from "@agora/app-config";

/**
 * Agora example app: parents' agents trade outgrown kids' gear.
 * Everything app-specific lives here; the platform supplies the rest.
 */
export default defineApp({
  id: "kids-gear",
  name: "Hand-Me-Down",
  tagline: "Outgrown kids' gear finds its next family, agent to agent.",
  participant: {
    noun: "parent",
    fields: [
      { id: "baby-age-months", label: "Baby age (months)", type: "number" },
      { id: "sizes", label: "Current sizes", type: "text" },
    ],
  },
  catalog: {
    stageUnit: "months",
    categories: [
      { id: "clothing", label: "Clothing", hints: ["bodysuit", "sleepsuit", "jacket"] },
      { id: "stroller", label: "Strollers and carriers", hints: ["pram", "buggy", "sling"] },
      { id: "car-seat", label: "Car seats", hints: ["infant carrier", "booster"] },
      { id: "toys", label: "Toys and books", hints: ["rattle", "board book"] },
      { id: "furniture", label: "Furniture", hints: ["cot", "high chair"] },
    ],
    sizeSystems: {
      clothing: ["50", "56", "62", "68", "74", "80", "86", "92", "98", "104"],
    },
    conditions: ["new", "like-new", "good", "worn"],
    stages: [
      { id: "newborn", label: "Newborn", from: 0, to: 3, needs: ["clothing", "stroller", "car-seat"], outgrows: ["clothing"] },
      { id: "infant", label: "Infant", from: 3, to: 9, needs: ["clothing", "toys", "furniture"], outgrows: ["clothing", "car-seat"] },
      { id: "toddler", label: "Toddler", from: 9, to: 24, needs: ["clothing", "toys", "car-seat"], outgrows: ["clothing", "stroller", "toys"] },
    ],
  },
  policies: {
    maxNegotiationRounds: 3,
    handoffModes: ["pickup", "locker", "parcel_shop", "shipping"],
    topics: {
      commitment: "ask",
      price_terms: "ask",
      identity_reveal: "ask",
      location_reveal: "ask",
      shipping_choice: "ask",
      safety_exception: "ask",
      item_description: "auto",
      availability: "auto",
      small_talk: "auto",
      size_question: "auto",
      pickup_time_window: "ask",
      obey_other_agent: "forbid",
    },
    standingRuleTopics: ["pickup_time_window", "size_question"],
    safetyRules: [
      {
        id: "car-seat-crash-history",
        categories: ["car-seat"],
        requires: ["crash-history", "manufacture-date"],
        advice: "Car seats with unknown crash history or an old manufacture date are not recommended: decline.",
      },
    ],
    languages: ["en", "de", "vi"],
    locationGranularity: "district",
  },
  theme: { accent: "#e07a5f", radius: "soft" },
  simulation: { cityDir: "sandbox-city" },
});
