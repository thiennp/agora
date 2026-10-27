import { describe, expect, it } from "vitest";
import { ACTS_FROM, confidenceFor, levelOf } from "./confidence";

describe("confidence", () => {
  it("grows with repeats and is capped", () => {
    expect([1, 2, 3].map(confidenceFor)).toEqual([0.5, 0.75, 0.875]);
    expect(confidenceFor(50)).toBe(0.95);
    expect(confidenceFor(0)).toBe(0);
  });
  it("acts on behaviour from the second sighting and labels three levels", () => {
    expect(confidenceFor(1)).toBeLessThan(ACTS_FROM);
    expect(confidenceFor(2)).toBeGreaterThanOrEqual(ACTS_FROM);
    expect([0.5, 0.75, 0.95].map(levelOf)).toEqual(["tentative", "likely", "strong"]);
  });
});
