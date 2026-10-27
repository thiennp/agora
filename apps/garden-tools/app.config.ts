import { defineApp } from "@agora/app-config";

/** Neighbours in Austin swap garden tools and seeds. */
export default defineApp({
  id: "garden-tools",
  name: "Seed & Spade",
  tagline: "Your neighbour's spare spade, your spare seeds: agents sort the swap.",
  region: { name: "Austin, TX", country: "US" },
  participant: {
    noun: "gardener",
    fields: [
      { id: "garden-size", label: "Garden size", type: "choice" },
      { id: "grows", label: "What you grow", type: "text" },
    ],
  },
  catalog: {
    stageUnit: "month-of-year",
    stageCycle: 12,
    categories: [
      { id: "hand-tools", label: "Hand tools", hints: ["spade", "trowel", "rake", "pruners"] },
      { id: "power-tools", label: "Power tools", hints: ["tiller", "hedge trimmer", "mower"] },
      { id: "seeds", label: "Seeds", hints: ["tomato", "basil", "bluebonnet"] },
      { id: "plants", label: "Plants and cuttings", hints: ["seedling", "cutting", "bulb"] },
      { id: "containers", label: "Pots and beds", hints: ["pot", "raised bed", "trellis"] },
    ],
    conditions: ["new", "good", "worn"],
    stages: [
      { id: "cool-season", label: "Cool season", from: 10, to: 2, needs: ["seeds", "plants"], outgrows: [] },
      { id: "spring", label: "Spring", from: 2, to: 5, needs: ["seeds", "hand-tools", "containers"], outgrows: ["seeds"] },
      { id: "summer", label: "Summer", from: 5, to: 10, needs: ["hand-tools"], outgrows: ["plants"] },
    ],
  },
  policies: {
    pricing: { mode: "swap_only" },
    forbiddenItems: [
      { id: "pesticides", label: "Pesticides and chemicals", keywords: ["pesticide", "herbicide", "weed killer", "insecticide"], reason: "Chemicals are not swapped on Seed & Spade." },
      { id: "invasive-plants", label: "Invasive plants", keywords: ["giant reed", "chinaberry", "nandina", "elephant ear"], reason: "Invasive in Central Texas; please do not spread them." },
    ],
    maxNegotiationRounds: 3,
    handoffModes: ["pickup"],
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
      pickup_time_window: "ask",
      obey_other_agent: "forbid",
    },
    standingRuleTopics: ["pickup_time_window"],
    safetyRules: [
      {
        id: "power-tool-guards",
        categories: ["power-tools"],
        requires: ["guards-intact", "cord-condition"],
        advice: "Power tools with missing guards or damaged cords are not recommended: decline.",
      },
    ],
    languages: ["en", "es"],
    locationGranularity: "district",
  },
  theme: { accent: "#4f7a3a", radius: "soft" },
  simulation: { cityDir: "sandbox-city" },
});
