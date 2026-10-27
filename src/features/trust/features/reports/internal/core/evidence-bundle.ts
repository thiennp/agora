import { sha256Hex } from "@/lib/crypto";

export interface EvidenceInput {
  /** SHA-256 of the message text, taken when it was sent; the text itself is not kept (privacy). */
  messageHash: string;
  at: string;
  /** Role relative to the report, never an identity. */
  role: "reporter" | "reported";
  /** Screening and signal labels, for example "payment", "blocked". */
  flags: string[];
}

export interface EvidenceEntry extends EvidenceInput {
  index: number;
  prevHash: string;
  hash: string;
}

export interface EvidenceBundle {
  entries: EvidenceEntry[];
  headHash: string;
  count: number;
}

const GENESIS = "0".repeat(64);
const link = (prev: string, e: EvidenceInput, index: number) => sha256Hex([prev, index, e.messageHash, e.at, e.role, [...e.flags].sort().join(",")].join("|"));

/** Hash-chained list of message hashes, timestamps and flags: editing or removing any entry breaks every later hash (TRU-RPT-02). */
export function buildEvidenceBundle(inputs: readonly EvidenceInput[]): EvidenceBundle {
  const ordered = [...inputs].sort((a, b) => a.at.localeCompare(b.at));
  const entries: EvidenceEntry[] = [];
  let prev = GENESIS;
  ordered.forEach((e, index) => {
    const hash = link(prev, e, index);
    entries.push({ ...e, flags: [...e.flags].sort(), index, prevHash: prev, hash });
    prev = hash;
  });
  return { entries, headHash: prev, count: entries.length };
}

export function verifyEvidenceBundle(b: EvidenceBundle): boolean {
  let prev = GENESIS;
  for (const [i, e] of b.entries.entries()) {
    if (e.index !== i || e.prevHash !== prev || e.hash !== link(prev, e, i)) return false;
    prev = e.hash;
  }
  return b.headHash === prev && b.count === b.entries.length;
}
