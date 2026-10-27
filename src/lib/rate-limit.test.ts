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

  it("forgets idle keys, so memory is bounded by the callers active in one window, not by every address ever seen", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
    for (let i = 0; i < 5000; i++) rl.check(`ip-${i}`);
    expect(rl.size()).toBe(5000);
    t = 1500;
    rl.check("fresh");
    expect(rl.size()).toBe(1);
  });
});
