import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchItems, summarize, type IntakeEvalResults, type PhotoRow } from "./intake-eval";
import { PHOTO_SPECS } from "./intake-photos";

const jacket = { name: "blue winter jacket", words: ["jacket", "coat"] };
const boots = { name: "red rain boots", words: ["boots", "boot"] };

describe("intake eval: scoring", () => {
  it("matches each expected item to at most one draft, by words in the draft's name", () => {
    expect(matchItems([jacket, boots], ["Blue winter jacket", "red rain boots"])).toEqual({ matched: 2, matchedDrafts: 2 });
    expect(matchItems([jacket, boots], ["a coat"])).toEqual({ matched: 1, matchedDrafts: 1 });
    expect(matchItems([jacket, jacket], ["one jacket"])).toEqual({ matched: 1, matchedDrafts: 1 });
    expect(matchItems([jacket], ["toy train"])).toEqual({ matched: 0, matchedDrafts: 0 });
  });

  it("summarizes rows into the figures the page shows", () => {
    const d = (name: string, extra: Partial<PhotoRow["drafts"][number]> = {}) => ({ name, hasCrop: true, noCropReason: null, needsCheck: false, cropLeak: { person: false, text: false }, ...extra });
    const rows: PhotoRow[] = [
      { id: "pile-01", kind: "pile", status: "ok", seconds: 10, original: null, expected: 2, matched: 2, drafts: [d("jacket"), d("boots", { needsCheck: true })] },
      { id: "pile-02", kind: "pile", status: "ok", seconds: 20, original: null, expected: 2, matched: 1, drafts: [d("jacket"), d("thing"), d("other")] },
      { id: "person-1", kind: "person", status: "ok", seconds: 5, original: { person: true, text: false }, drafts: [d("hat", { hasCrop: false, noCropReason: "person", cropLeak: null }), d("shoe", { cropLeak: { person: true, text: false } })] },
      { id: "text-1", kind: "text", status: "generation_failed", seconds: 0, original: null, drafts: [] },
      { id: "text-2", kind: "text", status: "retake:blurry", seconds: 3, original: { person: false, text: true }, drafts: [] },
    ];
    const s = summarize(rows);
    expect(s.photos).toEqual({ total: 5, pile: 2, person: 1, text: 2, generationFailed: 1, stoppedBeforeDrafts: 1 });
    expect(s.piles).toMatchObject({ photos: 2, exactlySix: 0, itemRecallPct: 75, draftPrecisionPct: 60, draftsWithCropPct: 100, draftsNeedingCheckPct: 20, meanSeconds: 15 });
    expect(s.privacy).toMatchObject({ validPrivacyPhotos: 2, drafts: 7, blockedForPerson: 1, crops: 6, cropsJudgedPerson: 1, cropLeakPct: 16.7 });
  });
});

describe("intake eval: photo set", () => {
  it("has six-item piles, people and text photos, with unique ids", () => {
    expect(new Set(PHOTO_SPECS.map((s) => s.id)).size).toBe(PHOTO_SPECS.length);
    const kinds = (k: string) => PHOTO_SPECS.filter((s) => s.kind === k);
    expect(kinds("pile").length).toBeGreaterThanOrEqual(12);
    expect(kinds("person").length).toBeGreaterThanOrEqual(6);
    expect(kinds("text").length).toBeGreaterThanOrEqual(6);
    for (const p of kinds("pile")) {
      expect(p.items, p.id).toHaveLength(6);
      for (const it of p.items) expect(it.words.length, `${p.id} ${it.name}`).toBeGreaterThan(0);
    }
  });
});

// The last measured run is committed (reports/ is not): this keeps the file honest and free of pictures.
describe("intake eval: the committed results", () => {
  const file = join(__dirname, "intake-eval.results.json");
  it.skipIf(!existsSync(file))("matches its own rows, names only photos in the set, and holds no picture data", () => {
    const text = readFileSync(file, "utf8");
    const r = JSON.parse(text) as IntakeEvalResults;
    expect(r.summary).toEqual(summarize(r.rows));
    const ids = new Set(PHOTO_SPECS.map((s) => s.id));
    for (const row of r.rows) expect(ids.has(row.id), row.id).toBe(true);
    expect(text).not.toMatch(/data:image|base64/);
    expect(statSync(file).size).toBeLessThan(150_000);
    expect(r.limits.length).toBeGreaterThan(0);
  });
});
