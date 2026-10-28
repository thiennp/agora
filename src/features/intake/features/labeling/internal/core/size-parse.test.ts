import { describe, expect, it } from "vitest";
import { normalizeSize } from "./size-parse";

const sizes = ["62", "68", "98", "104"];

describe("normalizeSize", () => {
  it("maps free text onto the app's own sizes", () => {
    expect(normalizeSize("98", sizes)).toBe("98");
    expect(normalizeSize("size 98", sizes)).toBe("98");
    expect(normalizeSize("Gr. 104 cm", sizes)).toBe("104");
  });
  it("never invents one: unknown, ambiguous or missing gives nothing", () => {
    expect(normalizeSize("92", sizes)).toBeUndefined();
    expect(normalizeSize("62 / 68", sizes)).toBeUndefined();
    expect(normalizeSize(null, sizes)).toBeUndefined();
    expect(normalizeSize("98", undefined)).toBeUndefined();
  });
});
