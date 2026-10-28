import { describe, expect, it } from "vitest";
import type { SamBox, SamClient } from "@/lib/meta";
import { locateItems } from "./segment-items.sam";

const box: SamBox = { x1: 1, y1: 2, x2: 30, y2: 40, width: 100, height: 100, confidence: 0.9 };

describe("locateItems", () => {
  it("tries a multi-word concept again as its last word when SAM found nothing, and only then", async () => {
    const asked: string[] = [];
    const sam: SamClient = { find: async (_i, c) => (asked.push(c), c === "book" ? [box] : []) };
    const out = await locateItems({ sam, image: "img", concepts: ["board book", "dollhouse", "play gym"] });
    expect(out.map((o) => o.boxes.length)).toEqual([1, 0, 0]);
    expect(asked.sort()).toEqual(["board book", "book", "dollhouse", "gym", "play gym"]);
  });
  it("does not retry when the first phrase worked, and skips empty concepts without a request", async () => {
    const asked: string[] = [];
    const sam: SamClient = { find: async (_i, c) => (asked.push(c), [box]) };
    const out = await locateItems({ sam, image: "img", concepts: ["rain boots", ""] });
    expect(out.map((o) => o.boxes.length)).toEqual([1, 0]);
    expect(asked).toEqual(["rain boots"]);
  });
  it("marks only the failing request as failed", async () => {
    const sam: SamClient = { find: async (_i, c) => { if (c === "bad") throw new Error("sam error 500"); return [box]; } };
    const out = await locateItems({ sam, image: "img", concepts: ["bad", "good"] });
    expect(out.map((o) => o.failed)).toEqual([true, false]);
  });
});
