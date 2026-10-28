import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ask, createDocsKb } from "@/lib/docs-kb";

/**
 * Retrieval quality of the docs knowledge base on the real documents (docs/DOCS-PLATFORM.md section 5).
 * `answerable`: the question's answer must be cited from one of the listed files within the top three passages.
 * `unanswerable`: the docs do not cover it, so the answer must be a refusal with no citation.
 * The set is small and was used while tuning the search, so treat the recall as an upper estimate and grow the set with real
 * questions (each miss someone reports should become a case here).
 */
const golden = JSON.parse(readFileSync("evals/docs-qa.golden.json", "utf8")) as {
  answerable: { q: string; anyOf: string[] }[];
  /** Written after the search was frozen, in different phrasing, and never used for tuning: the honest estimate. */
  heldOut: { q: string; anyOf: string[] }[];
  unanswerable: string[];
};
const thresholds = (JSON.parse(readFileSync("evals/thresholds.json", "utf8")) as { docsQa: { recallAt3: number; heldOutRecallAt3: number; refusalRate: number } }).docsQa;

describe("docs Q&A retrieval", () => {
  const index = createDocsKb(process.cwd()).index();

  it("finds the right document within the top three for the answerable questions", async () => {
    const misses: string[] = [];
    for (const c of golden.answerable) {
      const a = await ask(index, c.q, { k: 3 });
      const paths = a.citations.map((x) => x.path);
      if (!paths.some((p) => c.anyOf.includes(p))) misses.push(`${c.q}\n    wanted ${c.anyOf.join(" | ")}\n    got    ${paths.join(" | ") || "(refused)"}`);
    }
    const recall = 1 - misses.length / golden.answerable.length;
    console.log(`docs Q&A recall@3 = ${(recall * 100).toFixed(0)}% (${golden.answerable.length - misses.length}/${golden.answerable.length})${misses.length ? `\n  misses:\n  - ${misses.join("\n  - ")}` : ""}`);
    expect(recall).toBeGreaterThanOrEqual(thresholds.recallAt3);
  });

  it("holds up on held-out questions that were not used to tune the search", async () => {
    const misses: string[] = [];
    for (const c of golden.heldOut) {
      const a = await ask(index, c.q, { k: 3 });
      const paths = a.citations.map((x) => x.path);
      if (!paths.some((p) => c.anyOf.includes(p))) misses.push(`${c.q}\n    wanted ${c.anyOf.join(" | ")}\n    got    ${paths.join(" | ") || "(refused)"}`);
    }
    const recall = 1 - misses.length / golden.heldOut.length;
    console.log(`docs Q&A held-out recall@3 = ${(recall * 100).toFixed(0)}% (${golden.heldOut.length - misses.length}/${golden.heldOut.length})${misses.length ? `\n  misses:\n  - ${misses.join("\n  - ")}` : ""}`);
    expect(recall).toBeGreaterThanOrEqual(thresholds.heldOutRecallAt3);
  });

  it("refuses questions the docs cannot answer, without citing anything", async () => {
    const answered: string[] = [];
    for (const q of golden.unanswerable) {
      const a = await ask(index, q);
      if (a.grounded || a.citations.length) answered.push(`${q} -> ${a.citations.map((c) => c.path).join(", ")}`);
    }
    const refusal = 1 - answered.length / golden.unanswerable.length;
    console.log(`docs Q&A refusal rate = ${(refusal * 100).toFixed(0)}% (${golden.unanswerable.length - answered.length}/${golden.unanswerable.length})${answered.length ? `\n  answered anyway:\n  - ${answered.join("\n  - ")}` : ""}`);
    expect(refusal).toBeGreaterThanOrEqual(thresholds.refusalRate);
  });
});
