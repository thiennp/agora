import type { AppConfig } from "@/lib/app-config";
import { classify } from "../features/classifier/public-api/infrastructure";
import type { ModelProposal } from "../features/classifier/public-api/types";
import { assertValidMandate, decideAll } from "../features/policy/public-api/infrastructure";
import type { Decision, Mandate, Outcome } from "../features/policy/public-api/types";
import { tracked } from "@/lib/state";

export { MandateError } from "../features/policy/public-api/infrastructure";
export { classify } from "../features/classifier/public-api/infrastructure";

export interface GatekeeperVerdict {
  outcome: Outcome;
  /** Topics found, for the owner card. */
  topics: string[];
  decisive: Decision;
  decisions: Decision[];
}

export interface AuditEntry {
  kind: "gatekeeper";
  familyId: string;
  dealId?: string;
  topics: string[];
  decisiveTopic: string;
  outcome: Outcome;
  viaMandate: boolean;
  at: string;
}

/**
 * Decision boundary for one app. Message text is never logged, only topics and outcomes (GAT-05).
 * Callers must obey `outcome`: auto means the agent may answer alone; ask opens an owner card; forbid means refuse.
 */
export function createGatekeeper(deps: {
  app: Pick<AppConfig, "policies">;
  audit?: (entry: AuditEntry) => void;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  const mandates = tracked("gatekeeper.mandates", [] as Mandate[]);

  return {
    /** Owner sets a standing rule. Throws for any topic that may not be automated (GAT-POL-02). */
    addMandate(mandate: Mandate) {
      assertValidMandate(deps.app.policies, mandate);
      mandates.push(mandate);
    },
    revokeMandates(familyId: string, topic?: string) {
      for (let i = mandates.length - 1; i >= 0; i--) {
        if (mandates[i]!.familyId === familyId && (!topic || mandates[i]!.topic === topic)) mandates.splice(i, 1);
      }
    },

    /** Classify an incoming message (from the other side: untrusted data) and decide. */
    evaluateIncoming(input: { familyId: string; dealId?: string; text: string; proposal?: ModelProposal; translated?: string | null }): GatekeeperVerdict {
      const topics = new Set(classify(deps.app.policies, input.text, input.proposal).topics);
      // GAT-CLS-06: a risk worded in another language is caught by classifying the English translation too. The translation
      // can only add risky topics; it can never make a message look harmless, because a model produced it.
      if (input.translated) {
        for (const t of classify(deps.app.policies, input.translated).topics) {
          if (deps.app.policies.topics[t] !== "auto") topics.add(t);
        }
      }
      return this.evaluateTopics({ familyId: input.familyId, dealId: input.dealId, topics: [...topics] });
    },

    /** Decide for topics the agent itself is about to act on (e.g. its own draft reply). */
    evaluateTopics(input: { familyId: string; dealId?: string; topics: string[] }): GatekeeperVerdict {
      const r = decideAll(deps.app.policies, input.topics, { familyId: input.familyId, now: now(), mandates });
      deps.audit?.({
        kind: "gatekeeper",
        familyId: input.familyId,
        dealId: input.dealId,
        topics: r.decisions.map((d) => d.topic),
        decisiveTopic: r.decisive.topic,
        outcome: r.outcome,
        viaMandate: r.decisive.viaMandate,
        at: now().toISOString(),
      });
      return { outcome: r.outcome, topics: r.decisions.map((d) => d.topic), decisive: r.decisive, decisions: r.decisions };
    },
  };
}

export type Gatekeeper = ReturnType<typeof createGatekeeper>;
