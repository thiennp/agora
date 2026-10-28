import { describe, expect, it } from "vitest";
import { createCropStore } from "./store-crops";

describe("crop store", () => {
  it("moves a draft's picture to the item it became, once, and only for its owner", () => {
    const s = createCropStore();
    s.holdDraft("mia", "d1", "pic");
    expect(s.claim("jonas", "d1", "item1")).toBe(false);
    expect(s.claim("mia", "d1", "item1")).toBe(true);
    expect(s.forItem("item1")).toBe("pic");
    expect(s.claim("mia", "d1", "item2")).toBe(false);
    s.removeItem("item1");
    expect(s.forItem("item1")).toBeUndefined();
  });
  it("forgets drafts nobody listed after 30 minutes, and caps how many it holds", () => {
    let t = 0;
    const s = createCropStore(() => t);
    s.holdDraft("mia", "old", "pic");
    t += 31 * 60_000;
    expect(s.claim("mia", "old", "i")).toBe(false);
    for (let i = 0; i < 80; i++) s.holdDraft("mia", `d${i}`, "pic");
    expect(s.counts().drafts).toBeLessThanOrEqual(60);
  });
});
