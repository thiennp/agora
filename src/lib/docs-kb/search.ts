import type { DocChunk } from "./chunk";

/**
 * Lexical retrieval (BM25 with field weights). Chosen on purpose for this corpus: the docs are full of exact identifiers
 * (requirement ids such as BR-38, function names such as decideTurn, file paths) that embeddings blur and BM25 finds exactly,
 * it needs no model or network, it is deterministic, and it is cheap to evaluate. Quality is measured, not assumed:
 * see evals/docs-qa.eval.test.ts.
 */
export interface Hit {
  chunk: DocChunk;
  score: number;
  /**
   * Share of the query's weight found in the passage (0..1), where a rare term weighs more than a common one and a term that is
   * nowhere in the corpus weighs the most. Scale-free, so it can gate "not found": a question made of common words plus one
   * unknown subject is not covered, however many passages contain "deal".
   */
  coverage: number;
}

export interface SearchOptions {
  limit?: number;
  /** Cap passages per file so one long document cannot fill the whole list. */
  maxPerDoc?: number;
}

export interface Index {
  readonly size: number;
  readonly chunks: readonly DocChunk[];
  search(query: string, opts?: SearchOptions): Hit[];
}

const STOPWORDS = new Set(
  ("a an and are as at be but by can do does for from has have how i if in is it its of on or our that the their then there these this to was we what when where which who why will with you your should would could about into not no " +
    // question filler that says nothing about the topic, so it must not count against a question that is otherwise covered
    "between same different use used using work works explain describe tell mean means example examples exactly really just also any all each other than more most some such only own very much many get gets want need needs lack lacks compared compare comparing versus vs difference differences").split(" "),
);

const K1 = 1.2;
const B = 0.75;
/** How much a match in each field counts compared with the passage text. */
const WEIGHT = { text: 1, headings: 3, title: 2, path: 2 };

/**
 * Lowercase terms. Camel case is split and inflections are folded (erased, erasing, erasure → one term). A hyphenated word
 * stays whole only when it contains a digit, because that is what an identifier looks like (br-38, neg-ofr-02); "cell-based" is
 * just "cell" and "base", so a question using it is not penalised for a compound the docs never spell that way.
 */
export function tokenize(input: string): string[] {
  const spaced = input.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const out: string[] = [];
  for (const raw of spaced.toLowerCase().match(/[a-z0-9]+(?:[-_.][a-z0-9]+)*/g) ?? []) {
    const parts = raw.split(/[-_.]/);
    if (parts.length > 1 && raw.includes("-") && /\d/.test(raw)) out.push(raw);
    for (const p of parts) if (p && !STOPWORDS.has(p)) out.push(stem(p));
  }
  return out;
}

const SUFFIXES = ["ation", "ing", "ure", "ed", "es", "s", "ly"] as const;

/** A small suffix folder. Not linguistically exact; it only has to map the forms a doc and a question use to the same term. */
function stem(t: string): string {
  if (/\d/.test(t) || t.length <= 4) return t;
  if (t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  let out = t;
  for (const suffix of SUFFIXES) {
    if (out.endsWith(suffix) && out.length - suffix.length >= 3 && !(suffix === "s" && /(ss|us|is)$/.test(out))) {
      out = out.slice(0, -suffix.length);
      break;
    }
  }
  return out.length > 3 && out.endsWith("e") ? out.slice(0, -1) : out;
}

interface Doc {
  chunk: DocChunk;
  tf: Map<string, number>;
  len: number;
}

export function buildIndex(chunks: readonly DocChunk[]): Index {
  const docs: Doc[] = chunks.map((chunk) => {
    const tf = new Map<string, number>();
    let len = 0;
    const add = (text: string, weight: number) => {
      for (const t of tokenize(text)) {
        tf.set(t, (tf.get(t) ?? 0) + weight);
        len += weight;
      }
    };
    add(chunk.text, WEIGHT.text);
    add(chunk.headings.join(" "), WEIGHT.headings);
    add(chunk.title, WEIGHT.title);
    add(chunk.path, WEIGHT.path);
    return { chunk, tf, len };
  });

  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  const idf = (t: string) => {
    const n = df.get(t) ?? 0;
    return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
  };

  return {
    size: docs.length,
    chunks,
    search(query, opts = {}) {
      const terms = [...new Set(tokenize(query))];
      if (!terms.length) return [];
      const weight = new Map(terms.map((t) => [t, idf(t)]));
      const totalWeight = [...weight.values()].reduce((a, b) => a + b, 0);
      const scored: Hit[] = [];
      for (const d of docs) {
        let score = 0;
        let foundWeight = 0;
        for (const t of terms) {
          const f = d.tf.get(t);
          if (!f) continue;
          const w = weight.get(t)!;
          foundWeight += w;
          score += (w * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / avgLen));
        }
        if (score > 0) scored.push({ chunk: d.chunk, score, coverage: foundWeight / totalWeight });
      }
      scored.sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));
      return diversify(scored, opts.limit ?? 5, opts.maxPerDoc);
    },
  };
}

function diversify(sorted: Hit[], limit: number, maxPerDoc?: number): Hit[] {
  if (!maxPerDoc) return sorted.slice(0, limit);
  const perDoc = new Map<string, number>();
  const out: Hit[] = [];
  for (const h of sorted) {
    const n = perDoc.get(h.chunk.path) ?? 0;
    if (n >= maxPerDoc) continue;
    perDoc.set(h.chunk.path, n + 1);
    out.push(h);
    if (out.length === limit) break;
  }
  return out;
}
