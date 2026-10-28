import { describe, expect, it } from "vitest";
import { withOriginal } from "./discard-original";

describe("withOriginal", () => {
  it("zeroes the bytes after use and returns what was made from them", async () => {
    const photo = Buffer.from("secret photo bytes");
    const out = await withOriginal(photo, async (b) => b.toString().length);
    expect(out).toBe(18);
    expect(photo.every((x) => x === 0)).toBe(true);
  });
  it("zeroes the bytes even when the work fails", async () => {
    const photo = Buffer.from("secret photo bytes");
    await expect(withOriginal(photo, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(photo.every((x) => x === 0)).toBe(true);
  });
});
