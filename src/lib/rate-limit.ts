/** Sliding-window limiter, keyed by anything (an address, a family). In memory: one process, which is enough for the demo (API-02). */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
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
