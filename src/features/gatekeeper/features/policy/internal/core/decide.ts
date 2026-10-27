import type { AppConfig } from "@/lib/app-config";
import { ALWAYS_ASK, ALWAYS_FORBID, SEVERITY, type Outcome } from "./topics";

export interface Mandate {
  familyId: string;
  topic: string;
  level: "auto";
  /** ISO time; expired mandates are ignored. */
  expiresAt?: string;
}

export interface Decision {
  topic: string;
  outcome: Outcome;
  reason: string;
  viaMandate: boolean;
}

type Policies = Pick<AppConfig["policies"], "topics" | "standingRuleTopics">;

export class MandateError extends Error {}

/** A mandate may only move a low-risk topic from ask to auto (GAT-POL-02). Anything else throws. */
export function assertValidMandate(policies: Policies, mandate: Mandate): void {
  if (ALWAYS_ASK.has(mandate.topic) || ALWAYS_FORBID.has(mandate.topic)) {
    throw new MandateError(`${mandate.topic} can never be handled automatically`);
  }
  if (!policies.standingRuleTopics.includes(mandate.topic)) {
    throw new MandateError(`${mandate.topic} is not a standing-rule topic in this app`);
  }
  if (policies.topics[mandate.topic] === "forbid") {
    throw new MandateError(`${mandate.topic} is forbidden in this app`);
  }
}

/**
 * Pure decision for one topic (GAT-POL-01, 03). Order matters and is the safety argument:
 * 1. platform-forbidden topics are forbidden; 2. always-ask topics ask; 3. unknown topics ask;
 * 4. the app table decides; 5. a valid, unexpired mandate may lift "ask" to "auto" for standing-rule topics only.
 */
export function decide(
  policies: Policies,
  topic: string,
  ctx: { familyId: string; now: Date; mandates?: readonly Mandate[] },
): Decision {
  if (ALWAYS_FORBID.has(topic)) return { topic, outcome: "forbid", reason: "never allowed on any app", viaMandate: false };
  if (ALWAYS_ASK.has(topic)) return { topic, outcome: "ask", reason: "the owner always decides this", viaMandate: false };

  const base = policies.topics[topic];
  if (base === undefined) return { topic, outcome: "ask", reason: "unknown topic: ask the owner", viaMandate: false };
  if (base === "forbid") return { topic, outcome: "forbid", reason: "forbidden by this app", viaMandate: false };
  if (base === "auto") return { topic, outcome: "auto", reason: "low-risk topic the app allows", viaMandate: false };

  const mandate = (ctx.mandates ?? []).find(
    (m) => m.familyId === ctx.familyId && m.topic === topic && (!m.expiresAt || new Date(m.expiresAt) > ctx.now),
  );
  if (mandate) {
    try {
      assertValidMandate(policies, mandate);
      return { topic, outcome: "auto", reason: "owner's standing rule", viaMandate: true };
    } catch {
      /* an invalid mandate is ignored, never trusted */
    }
  }
  return { topic, outcome: "ask", reason: "the app asks the owner about this", viaMandate: false };
}

/** Most restrictive decision wins; with no topics at all the answer is ask (GAT-03). */
export function decideAll(
  policies: Policies,
  topics: readonly string[],
  ctx: { familyId: string; now: Date; mandates?: readonly Mandate[] },
): { outcome: Outcome; decisive: Decision; decisions: Decision[] } {
  if (topics.length === 0) {
    const d: Decision = { topic: "unknown", outcome: "ask", reason: "could not tell what this is about: ask the owner", viaMandate: false };
    return { outcome: "ask", decisive: d, decisions: [d] };
  }
  const decisions = topics.map((t) => decide(policies, t, ctx));
  const decisive = decisions.reduce((a, b) => (SEVERITY[b.outcome] > SEVERITY[a.outcome] ? b : a));
  return { outcome: decisive.outcome, decisive, decisions };
}
