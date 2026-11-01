/** 0.5 after one sighting, 0.75 after two, 0.875 after three, never above 0.95. */
export const confidenceFor = (count: number): number => Math.min(0.95, 1 - 0.5 ** Math.max(count, 0));

/** Lessons act on behaviour only from this confidence (two sightings). */
export const ACTS_FROM = 0.75;

type ConfidenceLevel = "tentative" | "likely" | "strong";
export const levelOf = (c: number): ConfidenceLevel => (c >= 0.9 ? "strong" : c >= ACTS_FROM ? "likely" : "tentative");
