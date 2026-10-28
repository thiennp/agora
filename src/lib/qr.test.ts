import { describe, expect, it } from "vitest";
import { makeQr } from "./qr";

/** Rebuild the dark-module grid from the path, to check it without a decoder. */
function grid({ size, d }: { size: number; d: string }): boolean[][] {
  const g = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, run] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (let i = 0; i < run; i++) g[y]![x + i] = true;
  }
  return g;
}

describe("makeQr", () => {
  it("is deterministic and depends on the text", () => {
    const a = makeQr("https://agentwitch.com/agora/start");
    expect(makeQr("https://agentwitch.com/agora/start")).toEqual(a);
    expect(makeQr("https://agentwitch.com/agora/other").d).not.toEqual(a.d);
  });

  it("includes a four-module quiet zone and the three finder patterns", () => {
    const q = makeQr("https://agentwitch.com/agora/start");
    const g = grid(q);
    const n = q.size - 8;
    expect(g.slice(0, 4).flat().some(Boolean)).toBe(false);
    expect(g.every((row) => !row.slice(0, 4).some(Boolean) && !row.slice(-4).some(Boolean))).toBe(true);
    for (const [fx, fy] of [[4, 4], [4 + n - 7, 4], [4, 4 + n - 7]] as const) {
      for (let i = 0; i < 7; i++) {
        expect(g[fy]![fx + i]).toBe(true);
        expect(g[fy + 6]![fx + i]).toBe(true);
        expect(g[fy + i]![fx]).toBe(true);
        expect(g[fy + i]![fx + 6]).toBe(true);
      }
      expect(g[fy + 1]![fx + 1]).toBe(false);
      expect(g[fy + 3]![fx + 3]).toBe(true);
    }
  });

  it("grows with longer text and rejects empty text", () => {
    expect(makeQr("https://agentwitch.com/agora/start?invite=" + "x".repeat(120)).size).toBeGreaterThan(makeQr("https://a.co/s").size);
    expect(() => makeQr("")).toThrow();
  });
});
