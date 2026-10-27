import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit per key inside the window, then refuses with a wait time", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect([1, 2, 3].map(() => rl.check("a").ok)).toEqual([true, true, true]);
    expect(rl.check("a")).toEqual({ ok: false, retryAfterSec: 1 });
    expect(rl.check("b").ok).toBe(true);
    t = 1001;
    expect(rl.check("a").ok).toBe(true);
  });
});
