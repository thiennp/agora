import type { AppConfig } from "@/lib/app-config";
import { BENIGN_PATTERNS, RISK_PATTERNS } from "./patterns";

export interface ModelProposal {
  topic: string;
  confidence: number;
}

export interface Classification {
  /** Every topic detected in the message. Empty means unknown. */
  topics: string[];
  /** Topics that came only from a model proposal (for audit and evals). */
  proposedOnly: string[];
}

const MIN_PROPOSAL_CONFIDENCE = 0.8;
const MAX_LEN = 4000;

type Policies = Pick<AppConfig["policies"], "topics" | "topicKeywords">;

/**
 * Label a message with topics. No side effects and no decisions (GAT-CLS-02).
 * - Risk patterns always add their topic. App keywords add app topics. Benign patterns add benign topics only when
 *   nothing risky was found, so "price" hidden inside a friendly message still reaches the policy.
 * - A model proposal can add a topic that exists in the app table (so it can escalate) but can never make a message
 *   benign: with no deterministic match the result stays unknown, and unknown means ask.
 */
export function classify(policies: Policies, text: string, proposal?: ModelProposal): Classification {
  const t = text.slice(0, MAX_LEN);
  const found = new Set<string>();

  for (const [topic, re] of Object.entries(RISK_PATTERNS)) if (re.test(t)) found.add(topic);

  const lower = t.toLowerCase();
  for (const [topic, words] of Object.entries(policies.topicKeywords)) {
    if (words.some((w) => lower.includes(w.toLowerCase()))) found.add(topic);
  }

  if (found.size === 0) {
    for (const [topic, re] of Object.entries(BENIGN_PATTERNS)) if (re.test(t)) found.add(topic);
  }

  const proposedOnly: string[] = [];
  if (proposal && proposal.confidence >= MIN_PROPOSAL_CONFIDENCE && proposal.topic in policies.topics && !found.has(proposal.topic)) {
    const benign = policies.topics[proposal.topic] === "auto";
    // A benign proposal with nothing deterministic behind it must not unlock auto; it stays unknown.
    if (!benign || found.size > 0) {
      found.add(proposal.topic);
      proposedOnly.push(proposal.topic);
    }
  }
  return { topics: [...found], proposedOnly };
}
