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

describe("limits lifted until the end of November 2026", () => {
  it("lets a liftable limiter through before December 1 and enforces it from then on; a non-liftable one always enforces", () => {
    let t = Date.parse("2026-11-30T23:59:00Z");
    const liftable = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => t, liftable: true });
    const guard = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => t });
    expect([liftable.check("a").ok, liftable.check("a").ok]).toEqual([true, true]);
    expect([guard.check("a").ok, guard.check("a").ok]).toEqual([true, false]);
    t = Date.parse("2026-12-01T00:00:00Z");
    expect([liftable.check("b").ok, liftable.check("b").ok]).toEqual([true, false]);
  });
});
