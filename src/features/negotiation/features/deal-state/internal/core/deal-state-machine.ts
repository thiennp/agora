export const DEAL_STATES = [
  "proposed", "countered", "agreed_by_agents", "awaiting_owner_input", "awaiting_owners", "confirmed",
  "declined", "expired", "handoff", "completed", "not_completed", "reported",
] as const;
export type DealState = (typeof DEAL_STATES)[number];

export interface Transition {
  from: DealState | null;
  to: DealState;
  event: string;
  at: string;
}

export interface Deal {
  id: string;
  appId: string;
  offerItemId: string;
  wantItemId: string;
  offerFamilyId: string;
  wantFamilyId: string;
  state: DealState;
  /** Offers exchanged so far; the proposal is round 1 (NEG-01). */
  round: number;
  maxRounds: number;
  /** Whose agent acts next. */
  turnFamilyId: string | null;
  previousState: DealState | null;
  /** The action that was paused for the owner, applied or dropped on the owner's answer. */
  pending: { topic: string; familyId: string; action: unknown } | null;
  flags: string[];
  /** Owners who confirmed. Only the owner-cards flow may add to this (NEG-STA-04). */
  confirmations: Record<string, boolean>;
  /** Terms the owner approved during this deal, by family, so the same terms are not asked twice. */
  approvedTerms: Record<string, string[]>;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  history: Transition[];
}

export type DealEvent =
  | { type: "counter" }
  | { type: "agree" }
  | { type: "open_cards" }
  | { type: "ask_owner"; familyId: string; topic: string; action: unknown }
  | { type: "owner_answered"; proceed: boolean }
  | { type: "owner_confirm"; familyId: string }
  | { type: "owner_decline"; familyId: string }
  | { type: "agents_decline"; reason: string }
  | { type: "expire" }
  | { type: "start_handoff" }
  | { type: "handoff_done"; ok: boolean }
  | { type: "report" };

export class IllegalTransitionError extends Error {
  constructor(from: DealState, event: string) {
    super(`cannot ${event} while ${from}`);
  }
}
export class RoundLimitError extends Error {
  constructor(max: number) {
    super(`a deal has at most ${max} rounds`);
  }
}

const OPEN: DealState[] = ["proposed", "countered", "agreed_by_agents", "awaiting_owner_input", "awaiting_owners"];

/** Which events each state accepts (NEG-STA-01, NEG-STA-02). Everything else throws. */
const ALLOWED: Record<DealState, DealEvent["type"][]> = {
  proposed: ["counter", "agree", "ask_owner", "agents_decline", "expire", "report"],
  countered: ["counter", "agree", "ask_owner", "agents_decline", "expire", "report"],
  agreed_by_agents: ["open_cards", "ask_owner", "expire", "report"],
  awaiting_owner_input: ["owner_answered", "expire", "report"],
  awaiting_owners: ["owner_confirm", "owner_decline", "expire", "report"],
  confirmed: ["start_handoff", "report"],
  handoff: ["handoff_done", "report"],
  completed: ["report"],
  not_completed: ["report"],
  declined: [],
  expired: [],
  reported: [],
};

export function createDeal(init: {
  id: string; appId: string; offerItemId: string; wantItemId: string; offerFamilyId: string; wantFamilyId: string;
  maxRounds: number; now: Date; ttlHours?: number;
}): Deal {
  const at = init.now.toISOString();
  return {
    id: init.id, appId: init.appId, offerItemId: init.offerItemId, wantItemId: init.wantItemId,
    offerFamilyId: init.offerFamilyId, wantFamilyId: init.wantFamilyId,
    state: "proposed", round: 1, maxRounds: init.maxRounds,
    // The wanting side proposes, so the offering side answers first.
    turnFamilyId: init.offerFamilyId, previousState: null, pending: null, flags: [], confirmations: {}, approvedTerms: {},
    expiresAt: new Date(init.now.getTime() + (init.ttlHours ?? 24) * 3_600_000).toISOString(),
    createdAt: at, updatedAt: at,
    history: [{ from: null, to: "proposed", event: "propose", at }],
  };
}

/** Pure transition: returns a new deal, never mutates, throws on anything illegal. */
export function next(deal: Deal, event: DealEvent, now: Date): Deal {
  if (!ALLOWED[deal.state].includes(event.type)) throw new IllegalTransitionError(deal.state, event.type);
  const other = (f: string) => (f === deal.offerFamilyId ? deal.wantFamilyId : deal.offerFamilyId);
  let to: DealState = deal.state;
  const d: Deal = { ...deal, confirmations: { ...deal.confirmations }, flags: [...deal.flags] };

  switch (event.type) {
    case "counter":
      if (deal.round >= deal.maxRounds) throw new RoundLimitError(deal.maxRounds);
      d.round += 1;
      d.turnFamilyId = deal.turnFamilyId ? other(deal.turnFamilyId) : null;
      to = "countered";
      break;
    case "agree":
      d.turnFamilyId = null;
      to = "agreed_by_agents";
      break;
    case "open_cards":
      to = "awaiting_owners";
      break;
    case "ask_owner":
      d.previousState = deal.state;
      d.pending = { topic: event.topic, familyId: event.familyId, action: event.action };
      to = "awaiting_owner_input";
      break;
    case "owner_answered":
      if (event.proceed) {
        to = deal.previousState ?? "proposed";
      } else {
        to = "declined";
        d.turnFamilyId = null;
      }
      d.previousState = null;
      break;
    case "owner_confirm": {
      if (event.familyId !== deal.offerFamilyId && event.familyId !== deal.wantFamilyId) throw new IllegalTransitionError(deal.state, "owner_confirm by a stranger");
      d.confirmations[event.familyId] = true;
      // The one way to confirmed: both owners said yes (NEG-STA-04).
      to = d.confirmations[deal.offerFamilyId] && d.confirmations[deal.wantFamilyId] ? "confirmed" : "awaiting_owners";
      break;
    }
    case "owner_decline":
    case "agents_decline":
      to = "declined";
      d.turnFamilyId = null;
      break;
    case "expire":
      if (!OPEN.includes(deal.state)) throw new IllegalTransitionError(deal.state, "expire");
      to = "expired";
      d.turnFamilyId = null;
      break;
    case "start_handoff":
      to = "handoff";
      break;
    case "handoff_done":
      to = event.ok ? "completed" : "not_completed";
      break;
    case "report":
      to = "reported";
      d.turnFamilyId = null;
      break;
  }

  const at = now.toISOString();
  d.state = to;
  d.updatedAt = at;
  d.history = [...deal.history, { from: deal.state, to, event: event.type, at }];
  return d;
}

export const isOpen = (d: Pick<Deal, "state">) => OPEN.includes(d.state);
