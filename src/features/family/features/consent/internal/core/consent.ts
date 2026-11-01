import { tracked } from "@/lib/state";
const CONSENT_SCOPES = ["share_items", "learning_commons"] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

interface ConsentDecision {
  familyId: string;
  scope: ConsentScope;
  granted: boolean;
  decidedAt: string;
}

export type AuditSink = (entry: { kind: "consent"; familyId: string; scope: ConsentScope; granted: boolean; at: string }) => void;

/** Opt-in, off by default, latest decision wins (FAM-CON-02). Every change is audited (FAM-CON-04). */
export function createConsentLedger(audit?: AuditSink, now: () => Date = () => new Date()) {
  const decisions = tracked("family.consent", [] as ConsentDecision[]);

  function record(familyId: string, scope: ConsentScope, granted: boolean): ConsentDecision {
    if (!CONSENT_SCOPES.includes(scope)) throw new Error(`unknown consent scope ${scope}`);
    const at = now().toISOString();
    const d: ConsentDecision = { familyId, scope, granted, decidedAt: at };
    decisions.push(d);
    audit?.({ kind: "consent", familyId, scope, granted, at });
    return d;
  }

  return {
    grant: (familyId: string, scope: ConsentScope) => record(familyId, scope, true),
    /** Withdrawing means items must leave the marketplace; callers react to `canShare` turning false (FAM-CON-03). */
    withdraw: (familyId: string, scope: ConsentScope) => record(familyId, scope, false),
    has(familyId: string, scope: ConsentScope): boolean {
      for (let i = decisions.length - 1; i >= 0; i--) {
        const d = decisions[i]!;
        if (d.familyId === familyId && d.scope === scope) return d.granted;
      }
      return false;
    },
    /** FAM-04: nothing is visible to other families before consent is recorded. */
    canShare(familyId: string): boolean {
      return this.has(familyId, "share_items");
    },
    history: (familyId: string) => decisions.filter((d) => d.familyId === familyId),
    erase(familyId: string) {
      for (let i = decisions.length - 1; i >= 0; i--) if (decisions[i]!.familyId === familyId) decisions.splice(i, 1);
    },
  };
}

