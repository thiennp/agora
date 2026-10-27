export interface Answer {
  topic: string;
  answer: "yes" | "no";
}

export interface Proposal {
  topic: string;
  /** How many identical yes-answers in a row led to it. */
  evidenceCount: number;
}

export const DEFAULT_THRESHOLD = 3;

/**
 * Propose a standing rule when an owner answered yes to the same low-risk topic `threshold` times in a row (LRN-STR-01).
 * Only eligible topics are ever considered, so always-ask topics are never proposed (LRN-STR-03); topics that already have a
 * rule or were dismissed are skipped. A proposal is only a suggestion: nothing activates without the owner's opt-in (LRN-STR-02).
 */
export function proposalsFor(
  history: readonly Answer[],
  opts: { eligible: readonly string[]; active: readonly string[]; dismissed: readonly string[]; threshold?: number },
): Proposal[] {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const out: Proposal[] = [];
  for (const topic of opts.eligible) {
    if (opts.active.includes(topic) || opts.dismissed.includes(topic)) continue;
    const answers = history.filter((a) => a.topic === topic);
    let run = 0;
    for (let i = answers.length - 1; i >= 0 && answers[i]!.answer === "yes"; i--) run++;
    if (run >= threshold) out.push({ topic, evidenceCount: run });
  }
  return out;
}
