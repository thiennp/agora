/** Sliding-window limiter, keyed by anything (an address, a family). In memory: one process, which is enough for the demo (API-02). */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, number[]>();
  return {
    check(key: string): { ok: boolean; retryAfterSec: number } {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((h) => t - h < opts.windowMs);
      if (recent.length >= opts.limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((opts.windowMs - (t - recent[0]!)) / 1000)) };
      }
      recent.push(t);
      hits.set(key, recent);
      return { ok: true, retryAfterSec: 0 };
    },
    reset: () => hits.clear(),
  };
}
