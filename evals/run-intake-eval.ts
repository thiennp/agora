import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { loadApp } from "@/lib/app-config";
import { CostMeter, createMetaApiAdapter, createMetaClient, createRouter, createSamClient } from "@/lib/meta";
import { createIntake, createMetaPorts } from "@/features/intake/public-api/infrastructure";
import { matchItems, summarize, type IntakeEvalResults, type PhotoRow } from "./intake-eval";
import { PHOTO_SPECS } from "./intake-photos";

/**
 * `npm run evals:intake [-- --cache reports/intake-photos --out evals/intake-eval.results.json --only pile-01,person-1]`
 * Needs META_API_KEY. Makes each photo with Muse Image (cached, so reruns only pay for new ones), runs it through the real intake path
 * (Muse Spark vision, SAM 3.1, crops), then has a separate Muse Spark call look at the original and at every crop and say whether a
 * person or readable text shows. The judge is the same model family as the labeler, so this is a check against obvious leaks, not
 * independent proof. Writes names and counts only: no photos, no crops.
 */
const arg = (n: string, d: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : d;
};
const cache = arg("cache", "reports/intake-photos");
const out = arg("out", "evals/intake-eval.results.json");
const only = arg("only", "").split(",").filter(Boolean);
const base = process.env.META_API_URL ?? "https://api.meta.ai/v1";
const apiKey = process.env.META_API_KEY;
if (!apiKey) throw new Error("META_API_KEY is required");

const judgeSchema = z.object({ showsPerson: z.boolean(), showsReadableText: z.boolean() });
const JUDGE = [
  "You check a picture for privacy. Answer with one JSON object: {\"showsPerson\": boolean, \"showsReadableText\": boolean}.",
  "showsPerson is true if any part of a human is visible: a face, a hand, an arm, legs, a body, even partly or at the edge.",
  "showsReadableText is true only if a person's name, a street address or a phone number can be read. Printed brand names, book titles and single words do not count.",
].join("\n");

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const res: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const i = next++; res[i] = await fn(items[i]!); } }));
  return res;
}

let imageGenerations = 0;
async function photoFor(id: string, prompt: string): Promise<Buffer | null> {
  mkdirSync(cache, { recursive: true });
  const file = join(cache, `${id}.webp`);
  if (existsSync(file)) return readFileSync(file);
  imageGenerations += 1;
  try {
    const res = await fetch(`${base}/images/generations`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "muse-image-1.0", prompt, n: 1 }) });
    if (!res.ok) return null;
    const b64 = ((await res.json()) as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
    if (!b64) return null;
    const buf = Buffer.from(b64, "base64");
    writeFileSync(file, buf);
    return buf;
  } catch {
    return null;
  }
}

async function main() {
  const app = await loadApp("kids-gear");
  let samCalls = 0;
  const sam = createSamClient({ baseUrl: base, apiKey: apiKey! });
  const countingSam = { find: (i: string, c: string) => { samCalls += 1; return sam.find(i, c); } };
  const client = createMetaClient({
    app,
    adapters: { "meta-api": createMetaApiAdapter({ baseUrl: base, apiKey: apiKey! }) },
    router: createRouter({ providers: { "muse-spark": "meta-api", "muse-spark-open": "meta-api" } }),
    meter: new CostMeter({ perParticipantUsd: 50, globalUsd: 50 }),
  });
  const intake = createIntake({ catalog: app.catalog, ports: createMetaPorts({ catalog: app.catalog, client, sam: countingSam }) });
  let judgeCalls = 0;
  const judge = async (jpegDataUrl: string) => {
    judgeCalls += 1;
    try {
      const r = await client.call({ role: "intake", participantId: "eval-judge", system: JUDGE, prompt: "Check this picture.", images: [jpegDataUrl], schema: judgeSchema });
      return { person: r.showsPerson, text: r.showsReadableText };
    } catch {
      return null;
    }
  };

  const specs = PHOTO_SPECS.filter((s) => only.length === 0 || only.includes(s.id));
  const rows = await pool(specs, 3, async (spec): Promise<PhotoRow> => {
    const started = Date.now();
    const original = await photoFor(spec.id, spec.prompt);
    if (!original) return { id: spec.id, kind: spec.kind, status: "generation_failed", seconds: 0, original: null, drafts: [] };
    const small = await sharp(original).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const originalLook = await judge(`data:image/jpeg;base64,${small.toString("base64")}`);
    const result = await intake.analyze("eval", Buffer.from(original));
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    if (result.status !== "ok") return { id: spec.id, kind: spec.kind, status: result.status === "retake" ? `retake:${result.reason}` : result.status, seconds, original: originalLook, drafts: [] };
    const drafts = await pool(result.drafts, 3, async (d) => ({
      name: d.name, hasCrop: Boolean(d.crop), noCropReason: d.noCropReason ?? null, needsCheck: d.needsCheck,
      cropLeak: d.crop ? await judge(d.crop) : null,
    }));
    const row: PhotoRow = { id: spec.id, kind: spec.kind, status: "ok", seconds, original: originalLook, drafts };
    if (spec.kind === "pile") Object.assign(row, { expected: spec.items.length, matched: matchItems(spec.items, drafts.map((d) => d.name)).matched });
    console.log(`${spec.id}: ${row.drafts.length} drafts${row.matched !== undefined ? `, ${row.matched}/${row.expected} matched` : ""}, ${seconds}s`);
    return row;
  });

  const results: IntakeEvalResults = {
    date: new Date().toISOString().slice(0, 10),
    models: { generator: "muse-image-1.0", vision: "muse-spark-1.3", segmentation: "sam-3.1", judge: "muse-spark-1.3" },
    calls: { imageGenerations, visionCalls: client.meter.summary().calls - judgeCalls, samCalls, judgeCalls },
    summary: summarize(rows),
    rows,
    limits: [
      "The photos are generated by a model from prompts, not taken by people, and a generated picture can miss its prompt (each original is checked too: in all 12 person and text photos the judge saw what the prompt asked for).",
      "The leak judge is Muse Spark, the same model family that labels the items: it catches obvious leaks, it is not an independent face detector.",
      "Item matching is by keywords in the draft name, so a correct item named in an unexpected way counts as a miss.",
    ],
  };
  writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results.summary, null, 2));
  console.log("calls", JSON.stringify(results.calls), "meter", JSON.stringify(client.meter.summary()));
}

main().catch((e) => {
  console.error("intake eval failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
