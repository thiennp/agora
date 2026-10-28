import { describe, expect, it } from "vitest";
import type { SamBox } from "@/lib/meta";
import { padBox, refineBoxes } from "./boxes";

const size = { width: 1000, height: 800 };
const sam = (x1: number, y1: number, x2: number, y2: number, confidence?: number, w = 1000, h = 800): SamBox => ({ x1, y1, x2, y2, width: w, height: h, confidence });

describe("refineBoxes", () => {
  it("keeps one confident box, clamped inside the photo", () => {
    expect(refineBoxes([sam(-20, 10, 300, 900, 0.9)], size)).toEqual([{ x1: 0, y1: 10, x2: 300, y2: 800 }]);
  });
  it("scales boxes when SAM saw a different size than the one we kept", () => {
    expect(refineBoxes([sam(100, 100, 200, 200, 0.9, 500, 400)], size)).toEqual([{ x1: 200, y1: 200, x2: 400, y2: 400 }]);
  });
  it("drops unsure, tiny and duplicate boxes", () => {
    const out = refineBoxes([sam(0, 0, 400, 400, 0.3), sam(0, 0, 10, 10, 0.9), sam(100, 100, 400, 400, 0.9), sam(105, 105, 402, 398, 0.9)], size);
    expect(out).toEqual([{ x1: 100, y1: 100, x2: 400, y2: 400 }]);
  });
  it("makes one box of a pair side by side, and one per thing when the count matches", () => {
    const two = [sam(100, 100, 300, 300, 0.9), sam(350, 100, 550, 300, 0.9)];
    expect(refineBoxes(two, size, 1)).toEqual([{ x1: 100, y1: 100, x2: 550, y2: 300 }]);
    expect(refineBoxes(two, size, 2)).toHaveLength(2);
    expect(refineBoxes(two, size, 3)).toHaveLength(1);
  });
  it("does not merge boxes that are far apart into one huge crop: it keeps the most confident one", () => {
    const apart = [sam(50, 50, 250, 250, 0.7), sam(700, 500, 900, 700, 0.95), sam(50, 500, 250, 700, 0.8)];
    expect(refineBoxes(apart, size, 1)).toEqual([{ x1: 700, y1: 500, x2: 900, y2: 700 }]);
  });
  it("finds nothing when SAM found nothing", () => {
    expect(refineBoxes([], size)).toEqual([]);
  });
});

describe("padBox", () => {
  it("adds room but stays inside the photo", () => {
    expect(padBox({ x1: 0, y1: 100, x2: 1000, y2: 200 }, size, 0.05)).toEqual({ x1: 0, y1: 60, x2: 1000, y2: 240 });
  });
});
