import type { ExpectedItem } from "./intake-photos";

/** What one photo produced, as recorded by the harness. No pictures and no crops: names and counts only. */
export interface PhotoRow {
  id: string;
  kind: "pile" | "person" | "text";
  /** `ok`, or the intake status that stopped it (retake, unreadable, unavailable), or `generation_failed`. */
  status: string;
  seconds: number;
  /** A second look at the original photo by the judge: does it really show what the prompt asked for? */
  original: { person: boolean; text: boolean } | null;
  drafts: { name: string; hasCrop: boolean; noCropReason: string | null; needsCheck: boolean; cropLeak: { person: boolean; text: boolean } | null }[];
  /** Pile photos only: expected items that some draft matched. */
  matched?: number;
  expected?: number;
}

/** Greedy match of expected items to draft names: each draft can satisfy one expected item. */
export function matchItems(expected: ExpectedItem[], draftNames: string[]): { matched: number; matchedDrafts: number } {
  const used = new Set<number>();
  let matched = 0;
  for (const e of expected) {
    const i = draftNames.findIndex((n, k) => !used.has(k) && e.words.some((w) => n.toLowerCase().includes(w)));
    if (i >= 0) {
      used.add(i);
      matched += 1;
    }
  }
  return { matched, matchedDrafts: used.size };
}

const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);

export interface Summary {
  photos: { total: number; pile: number; person: number; text: number; generationFailed: number; stoppedBeforeDrafts: number };
  piles: { photos: number; exactlySix: number; exactlySixPct: number | null; itemRecallPct: number | null; draftPrecisionPct: number | null; draftsWithCropPct: number | null; draftsNeedingCheckPct: number | null; meanSeconds: number | null };
  privacy: {
    /** Photos of person/text kind where the judge confirmed the original really shows a person or readable text. */
    validPrivacyPhotos: number;
    drafts: number;
    blockedForPerson: number;
    blockedForText: number;
    crops: number;
    cropsJudgedPerson: number;
    cropsJudgedText: number;
    cropLeakPct: number | null;
  };
}

export function summarize(rows: PhotoRow[]): Summary {
  const of = (k: PhotoRow["kind"]) => rows.filter((r) => r.kind === k);
  const piles = of("pile").filter((r) => r.status === "ok");
  const six = piles.filter((r) => r.drafts.length === 6).length;
  const expected = piles.reduce((a, r) => a + (r.expected ?? 0), 0);
  const matched = piles.reduce((a, r) => a + (r.matched ?? 0), 0);
  const pDrafts = piles.flatMap((r) => r.drafts);
  const matchedDrafts = piles.reduce((a, r) => a + Math.min(r.matched ?? 0, r.drafts.length), 0);
  const drafts = rows.flatMap((r) => r.drafts);
  const crops = drafts.filter((d) => d.hasCrop);
  const person = crops.filter((d) => d.cropLeak?.person).length;
  const text = crops.filter((d) => d.cropLeak?.text && !d.cropLeak?.person).length;
  const leaks = crops.filter((d) => d.cropLeak && (d.cropLeak.person || d.cropLeak.text)).length;
  return {
    photos: {
      total: rows.length, pile: of("pile").length, person: of("person").length, text: of("text").length,
      generationFailed: rows.filter((r) => r.status === "generation_failed").length,
      stoppedBeforeDrafts: rows.filter((r) => r.status !== "ok" && r.status !== "generation_failed").length,
    },
    piles: {
      photos: piles.length, exactlySix: six, exactlySixPct: pct(six, piles.length), itemRecallPct: pct(matched, expected), draftPrecisionPct: pct(matchedDrafts, pDrafts.length),
      draftsWithCropPct: pct(pDrafts.filter((d) => d.hasCrop).length, pDrafts.length), draftsNeedingCheckPct: pct(pDrafts.filter((d) => d.needsCheck).length, pDrafts.length),
      meanSeconds: piles.length ? Math.round((piles.reduce((a, r) => a + r.seconds, 0) / piles.length) * 10) / 10 : null,
    },
    privacy: {
      validPrivacyPhotos: rows.filter((r) => r.kind !== "pile" && r.original && (r.kind === "person" ? r.original.person : r.original.text)).length,
      drafts: drafts.length,
      blockedForPerson: drafts.filter((d) => d.noCropReason === "person").length,
      blockedForText: drafts.filter((d) => d.noCropReason === "text").length,
      crops: crops.length, cropsJudgedPerson: person, cropsJudgedText: text, cropLeakPct: pct(leaks, crops.length),
    },
  };
}

export interface IntakeEvalResults {
  date: string;
  models: { generator: string; vision: string; segmentation: string; judge: string };
  /** How many calls each step made, for cost. */
  calls: { imageGenerations: number; visionCalls: number; samCalls: number; judgeCalls: number };
  summary: Summary;
  rows: PhotoRow[];
  limits: string[];
}
