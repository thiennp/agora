/** Request and app-count limits are lifted for this app until the end of November 2026 (the hackathon and its judging); abuse guards (recovery-code and bad-key guessing) are never lifted. */
const LIMITS_LIFTED_UNTIL = Date.parse("2026-12-01T00:00:00Z");
export const limitsLifted = (t: number = Date.now()) => t < LIMITS_LIFTED_UNTIL;

/** Sliding-window limiter, keyed by anything (an address, a family). In memory: one process (API-02). With `liftable`, it lets everything through while `limitsLifted()` is true. */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number; liftable?: boolean }) {
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, number[]>();
  let lastSweep = now();
  /** Forget keys with no hit inside the window, at most once per window, so the map cannot grow with every address ever seen. */
  const sweep = (t: number) => {
    if (t - lastSweep < opts.windowMs) return;
    lastSweep = t;
    for (const [key, times] of hits) if (times.every((h) => t - h >= opts.windowMs)) hits.delete(key);
  };
  return {
    check(key: string): { ok: boolean; retryAfterSec: number } {
      const t = now();
      if (opts.liftable && limitsLifted(t)) return { ok: true, retryAfterSec: 0 };
      sweep(t);
      const recent = (hits.get(key) ?? []).filter((h) => t - h < opts.windowMs);
      if (recent.length >= opts.limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((opts.windowMs - (t - recent[0]!)) / 1000)) };
      }
      recent.push(t);
      hits.set(key, recent);
      return { ok: true, retryAfterSec: 0 };
    },
    /** Number of keys currently remembered (for tests and metrics). */
    size: () => hits.size,
    reset: () => hits.clear(),
  };
}
