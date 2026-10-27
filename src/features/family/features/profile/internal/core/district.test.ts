import { describe, expect, it } from "vitest";
import { districtFromCoords, districtFromName, toDistrictCode } from "./district";

describe("district", () => {
  it("puts nearby points in the same cell and far points in another", () => {
    expect(districtFromCoords(30.2672, -97.7431)).toBe(districtFromCoords(30.2701, -97.7399));
    expect(districtFromCoords(30.2672, -97.7431)).not.toBe(districtFromCoords(30.4, -97.7431));
  });

  it("never keeps more than cell precision", () => {
    expect(districtFromCoords(30.26723456, -97.74318765)).toMatch(/^g:30\.25:-97\.75$/);
  });

  it("slugs names and strips accents", () => {
    expect(districtFromName("Neukölln")).toBe("n:neukolln");
    expect(toDistrictCode({ name: "Hyde Park" })).toBe("n:hyde-park");
  });

  it("refuses addresses, empty names and bad coordinates", () => {
    expect(() => districtFromName("12 Oak Street")).toThrow();
    expect(() => districtFromName("  ")).toThrow();
    expect(() => districtFromCoords(200, 0)).toThrow();
  });
});
