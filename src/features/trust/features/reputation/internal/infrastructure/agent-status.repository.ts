import { changeFor, clamp, shouldBan, THRESHOLDS, type AgentStatus, type ReputationEvent } from "../core/trust-score";
import { tracked } from "@/lib/state";

/** Agent status per family. In-memory; the `agent_status` table (migration 0008) mirrors it. */
export function createReputation(deps: { now?: () => Date } = {}) {
  const now = deps.now ?? (() => new Date());
  const rows = tracked("trust.agentStatus", new Map<string, AgentStatus>());
  const get = (familyId: string): AgentStatus => rows.get(familyId) ?? { familyId, score: THRESHOLDS.start, history: [], banned: false };

  return {
    status: (familyId: string): AgentStatus => structuredClone(get(familyId)),
    record(familyId: string, event: ReputationEvent): AgentStatus {
      const s = get(familyId);
      const change = changeFor(event);
      if (change) {
        s.score = clamp(s.score + change.delta);
        s.history = [...s.history, { ...change, at: now().toISOString() }];
        if (shouldBan(s)) s.banned = true;
      }
      rows.set(familyId, s);
      return structuredClone(s);
    },
    /** Banned or restricted agents cannot start deals; restricted ones may still answer (TRU-04). */
    canStartDeal(familyId: string): boolean {
      const s = get(familyId);
      return !s.banned && s.score >= THRESHOLDS.restricted;
    },
    /** Only banned agents lose the right to relay messages. */
    canRelay: (familyId: string): boolean => !get(familyId).banned,
    erase: (familyId: string) => void rows.delete(familyId),
  };
}

