import type { CallRecord, ModelId } from "./types";

/**
 * USD per 1M tokens, always shown as estimates.
 * muse-spark: public-preview rate reported in press coverage (Oct 2026), not yet checked against Meta's pricing page.
 * muse-spark-open: UNVERIFIED placeholder; no public price found. Replace before quoting any cost figure.
 */
export const PRICE_PER_MTOK: Record<ModelId, { input: number; output: number }> = {
  "muse-spark": { input: 1.25, output: 4.25 },
  "muse-spark-open": { input: 0.15, output: 0.6 },
};

export function costOf(model: ModelId, inputTokens: number, outputTokens: number): number {
  const p = PRICE_PER_MTOK[model];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export class BudgetExceededError extends Error {
  constructor(readonly scope: "participant" | "global") {
    super(`model budget exceeded (${scope})`);
  }
}

interface Budget {
  perParticipantUsd: number;
  globalUsd: number;
}

/** Records every call (LIB-META-03) and enforces per-participant budgets plus a global breaker (LIB-03). */
export class CostMeter {
  private calls: CallRecord[] = [];
  private byParticipant = new Map<string, number>();
  private total = 0;

  constructor(
    private budget: Budget,
    private sink?: (record: CallRecord) => void,
  ) {}

  /** Throws before a call is made if the budget is already spent; callers fall back to deterministic mode. */
  assertWithinBudget(participantId: string | null): void {
    if (this.total >= this.budget.globalUsd) throw new BudgetExceededError("global");
    if (participantId && (this.byParticipant.get(participantId) ?? 0) >= this.budget.perParticipantUsd) {
      throw new BudgetExceededError("participant");
    }
  }

  record(record: CallRecord): void {
    this.calls.push(record);
    this.total += record.costUsd;
    if (record.participantId) {
      this.byParticipant.set(record.participantId, (this.byParticipant.get(record.participantId) ?? 0) + record.costUsd);
    }
    this.sink?.(record);
  }

  summary() {
    const byModel: Record<string, { calls: number; costUsd: number }> = {};
    const byRole: Record<string, { calls: number; costUsd: number }> = {};
    for (const c of this.calls) {
      for (const [map, key] of [[byModel, c.model], [byRole, c.role]] as const) {
        const e = (map[key] ??= { calls: 0, costUsd: 0 });
        e.calls += 1;
        e.costUsd += c.costUsd;
      }
    }
    return { calls: this.calls.length, totalUsd: this.total, byModel, byRole, estimated: true as const };
  }
}
