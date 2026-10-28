import { loadApp } from "@/lib/app-config";
import { createMatchService } from "@/features/matching/public-api/infrastructure";

/**
 * `npm run bench:matching [-- --items 100000 --lookups 2000 --app kids-gear]`
 * Measures one lookup ("best counterparts for this item") against an in-memory index of N listed items, in two worlds:
 *   spread: items spread over a wide area (many small buckets);
 *   metro:  80% of items inside one city of ~15 x 15 km (few, large buckets), which is the realistic worst case.
 * Single process, single thread, no model calls, deterministic data. These numbers say nothing about a database-backed index.
 */
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};
const N = Number(arg("items", "100000"));
const LOOKUPS = Number(arg("lookups", "2000"));
const appId = arg("app", "kids-gear");

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;

async function main() {
  const app = await loadApp(appId);
  const categories = app.catalog.categories.map((c) => c.id);
  const conditions = app.catalog.conditions;
  console.log(`items ${N.toLocaleString()}, lookups ${LOOKUPS.toLocaleString()}, app ${appId}, ${categories.length} categories\n`);
  console.log("world   | build ms | heap MB | p50 ms | p99 ms | max ms");

  for (const world of ["spread", "metro"] as const) {
    const rand = lcg(20261027);
    const place = () => {
      const inMetro = world === "metro" && rand() < 0.8;
      const lat = inMetro ? 52.4 + rand() * 0.14 : 47 + rand() * 8; // 0.14 deg is about 15 km
      const lon = inMetro ? 13.3 + rand() * 0.22 : 6 + rand() * 12;
      return `g:${(Math.round(lat / 0.05) * 0.05).toFixed(2)}:${(Math.round(lon / 0.05) * 0.05).toFixed(2)}`;
    };
    const match = createMatchService({ app, topN: 3 });
    const probes: ReturnType<typeof item>[] = [];
    function item(i: number, kind: "offer" | "want") {
      return {
        id: `i${i}`, appId, familyId: `f${i}`, kind, category: categories[Math.floor(rand() * categories.length)]!,
        size: String(50 + 6 * Math.floor(rand() * 8)), condition: conditions[Math.floor(rand() * conditions.length)]!,
        createdAt: "2026-10-27T00:00:00.000Z", districtCode: place(),
      };
    }
    if (global.gc) global.gc();
    const heap0 = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      const it = item(i, i % 2 === 0 ? "offer" : "want");
      match.onListed(it);
      if (i % 2 === 1 && probes.length < LOOKUPS) probes.push(it);
    }
    const buildMs = performance.now() - t0;
    const heapMb = (process.memoryUsage().heapUsed - heap0) / 1e6;

    const times: number[] = [];
    for (const p of probes) {
      const s = performance.now();
      match.candidatesFor(p);
      times.push(performance.now() - s);
    }
    times.sort((a, b) => a - b);
    console.log(
      `${world.padEnd(7)} | ${buildMs.toFixed(0).padStart(8)} | ${heapMb.toFixed(0).padStart(7)} | ${pct(times, 0.5).toFixed(3).padStart(6)} | ${pct(times, 0.99).toFixed(3).padStart(6)} | ${times[times.length - 1]!.toFixed(2).padStart(6)} `,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
