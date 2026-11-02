import { getIdentityStore, isStoredApp, sessionTokenOf } from "./identity";
import { appSummaryById } from "./app-views";
import { getPlatform, type Platform } from "./platform";

/**
 * The member status page's data (BR-43, docs/PLAN.md §2c step 5): everything one member's agent works on in one app, grouped.
 * Built only from the existing read views, keyed by the member id. It holds decisions, counts and short labels, never message
 * text, addresses or another member's data (BR-30). The audit store is a stub today, so "what the agent did alone" is derived
 * from the member's own deals and says so.
 */
const DAYS = 7;
const DAY_MS = 24 * 3_600_000;

const STATE_LABEL: Record<string, string> = {
  proposed: "Offer made", countered: "Negotiating", agreed_by_agents: "Agents agreed", awaiting_owner_input: "Waiting for you", awaiting_owners: "Waiting for owners",
  confirmed: "Confirmed", declined: "Declined", expired: "Expired", handoff: "Handover", completed: "Done", not_completed: "Did not happen", reported: "Reported",
};
const OPEN = new Set(["proposed", "countered", "agreed_by_agents", "awaiting_owner_input", "awaiting_owners", "confirmed", "handoff"]);

interface MemberStatus {
  app: { id: string; name: string };
  member: { id: string; name: string; role: "creator" | "member" };
  waiting: {
    questions: { id: string; dealId: string; text: string; expiresAt: string }[];
    confirmations: { id: string; dealId: string; item: string; role: string }[];
    offers: { id: string; text: string }[];
  };
  deals: { id: string; item: string; role: string; state: string; stateLabel: string; open: boolean; updatedAt: string }[];
  dealsByState: { label: string; value: number }[];
  items: { id: string; kind: "offer" | "want"; text: string; status: string }[];
  itemsByStatus: { label: string; value: number }[];
  alone: { agreedWithoutYou: number; roundsHandled: number; dealsRunning: number };
  activity: { days: string[]; counts: number[] };
  lessons: { id: string; text: string; seenTimes: number; level: string }[];
  rules: { id: string; topic: string; expiresAt?: string }[];
  /** Parts that cannot be filled yet, said on the page instead of shown empty. */
  missing: string[];
}

const tally = (xs: string[]) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].map(([label, value]) => ({ label, value }));
};

/** The member's status from the running platform of their app. An unknown member id simply has nothing (empty groups). */
export async function memberStatusFor(p: Platform, member: { id: string; name: string; role: "creator" | "member" }, now = Date.now()): Promise<MemberStatus> {
  await p.cards.settled();
  const questions = p.cards.questionsFor(member.id).map((q) => ({ id: q.id, dealId: q.dealId, text: q.text, expiresAt: q.expiresAt }));
  const rawDeals = await p.negotiation.listForFamily(member.id);
  const itemOf = async (id: string) => {
    const i = await p.catalog.items.get(id);
    return i ? i.description || p.app.catalog.categories.find((c) => c.id === i.category)?.label || i.category : "an item";
  };
  const confirmations = await Promise.all(
    p.cards.confirmationsFor(member.id).map(async (c) => {
      const d = await p.negotiation.get(c.dealId);
      return { id: c.id, dealId: c.dealId, item: d ? await itemOf(d.offerItemId) : "an item", role: d?.offerFamilyId === member.id ? "giving" : "receiving" };
    }),
  );
  const deals = await Promise.all(
    rawDeals.map(async (d) => ({
      id: d.id, item: await itemOf(d.offerItemId), role: d.offerFamilyId === member.id ? "giving" : "receiving", state: d.state,
      stateLabel: STATE_LABEL[d.state] ?? d.state, open: OPEN.has(d.state), updatedAt: d.updatedAt,
    })),
  );
  const mine = (await p.catalog.items.listForFamily(member.id)).filter((i) => i.status !== "withdrawn");
  const items = mine.map((i) => ({ id: i.id, kind: i.kind, text: i.description || p.app.catalog.categories.find((c) => c.id === i.category)?.label || i.category, status: i.status }));
  const days = Array.from({ length: DAYS }, (_, k) => new Date(now - (DAYS - 1 - k) * DAY_MS).toISOString().slice(0, 10));
  const counts = days.map(() => 0);
  for (const d of rawDeals) for (const h of d.history) {
    const k = days.indexOf(String(h.at).slice(0, 10));
    if (k >= 0) counts[k]!++;
  }
  const rules = p.book.list(member.id).map((r) => ({ id: r.id, topic: r.topic.replace(/_/g, " "), expiresAt: r.expiresAt }));
  const offers = [...p.learning.stretchOffersFor(member.id), ...p.learning.proposalsFor(member.id)].map((o) => ({ id: o.id, text: o.text }));
  return {
    app: { id: p.app.id, name: p.app.name },
    member,
    waiting: { questions, confirmations, offers },
    deals,
    dealsByState: tally(deals.map((d) => d.stateLabel)),
    items,
    itemsByStatus: tally(items.map((i) => i.status.replace(/_/g, " "))),
    alone: {
      agreedWithoutYou: rawDeals.filter((d) => d.history.some((h) => h.to === "agreed_by_agents")).length,
      roundsHandled: rawDeals.reduce((n, d) => n + d.round, 0),
      dealsRunning: deals.filter((d) => d.open).length,
    },
    activity: { days, counts },
    lessons: await p.learning.whatILearned(member.id),
    rules,
    missing: ["The audit log is not written yet, so this page shows what your agent did from your own deals, not a full log."],
  };
}

type MemberStatusView = { kind: "denied" } | { kind: "ok"; status: MemberStatus };

/**
 * `/app/{app}/muse/{id}` (BR-43). Only the member whose id it is, proved by that app's session cookie, sees it. Everyone else, the
 * creator looking at another member included, a stranger, a forged cookie and an unknown id, gets the same "denied", so a page
 * cannot be probed for who exists. Repository (demo) apps have no members and no status page.
 */
export async function memberStatusView(appId: string, memberId: string, cookieHeader: string | null): Promise<MemberStatusView> {
  const app = await appSummaryById(appId);
  if (!app || !isStoredApp(appId)) return { kind: "denied" };
  const headers: Record<string, string> = cookieHeader ? { cookie: cookieHeader } : {};
  const who = await getIdentityStore().authenticate(appId, sessionTokenOf(new Request("http://localhost/", { headers }), appId));
  if (!who || who.memberId !== memberId) return { kind: "denied" };
  const me = (await getIdentityStore().members(appId)).find((m) => m.memberId === memberId);
  return { kind: "ok", status: await memberStatusFor(await getPlatform(appId), { id: memberId, name: me?.name ?? "", role: who.role }) };
}

const EVENT_LABEL: Record<string, string> = {
  propose: "Your agent made an offer", counter: "A counter-offer was exchanged", agree: "The agents agreed on terms", open_cards: "Cards were opened for the owners",
  ask_owner: "Your agent asked its owner", owner_answered: "An owner answered a question", owner_confirm: "An owner confirmed", owner_decline: "An owner declined",
  agents_decline: "The agents declined", expire: "The deal expired", start_handoff: "The handover started", handoff_done: "The handover finished", report: "A problem was reported",
};

interface MemberAction {
  at: string;
  dealId: string;
  item: string;
  what: string;
  state: string;
}

async function allActionsOf(p: Platform, memberId: string): Promise<MemberAction[]> {
  await p.cards.settled();
  const out: MemberAction[] = [];
  for (const d of await p.negotiation.listForFamily(memberId)) {
    const i = await p.catalog.items.get(d.offerItemId);
    const item = i ? i.description || i.category : "an item";
    for (const h of d.history) {
      out.push({ at: String(h.at), dealId: d.id, item, what: EVENT_LABEL[h.event] ?? "The deal changed", state: STATE_LABEL[h.to] ?? h.to });
    }
  }
  return out;
}

/**
 * The member's recent actions (BR-44): the state changes of their own deals, newest first. Decisions only, never message text. Like
 * "what it did alone" this stands in for the audit log, which is not written yet.
 */
export async function memberActionsFor(p: Platform, memberId: string, limit = 20): Promise<MemberAction[]> {
  return (await allActionsOf(p, memberId)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, Math.max(1, Math.min(limit, 50)));
}

/** Before every real timestamp: the cursor of a member whose deals have never changed. */
export const UPDATES_START = "1970-01-01T00:00:00.000Z";

export interface MemberUpdates {
  /** Pass this back as `since` next time. It only moves forward, and only past events that were returned. */
  cursor: string;
  /** What changed in the member's own deals after `since`, oldest first. Empty when `since` is not given (the first call only sets the cursor). */
  events: MemberAction[];
  /** More events than `limit` were waiting: call again with the new cursor. */
  more: boolean;
  /** Cards waiting for the owner right now (always the current number, not a change). */
  waiting: { total: number; questions: number; confirmations: number; offers: number };
}

/**
 * What an assistant polls for (docs/MUSE-CONNECTOR.md): the member's own deal changes since a cursor, and how many cards wait for the
 * owner. Same data and same limits as the actions feed: decisions and counts, never message text, never another member's data. Without
 * `since` it returns no events and a cursor at the latest one, so a new connection does not announce the past. The cursor is an event
 * time; two events in the same millisecond are returned together (a limit cut never splits them).
 */
export async function memberUpdatesFor(p: Platform, memberId: string, since?: string, limit = 20): Promise<MemberUpdates> {
  const all = (await allActionsOf(p, memberId)).sort((a, b) => a.at.localeCompare(b.at));
  const questions = p.cards.questionsFor(memberId).length;
  const confirmations = p.cards.confirmationsFor(memberId).length;
  const offers = p.learning.stretchOffersFor(memberId).length + p.learning.proposalsFor(memberId).length;
  const waiting = { total: questions + confirmations + offers, questions, confirmations, offers };
  const latest = all.at(-1)?.at ?? UPDATES_START;
  if (since === undefined) return { cursor: latest, events: [], more: false, waiting };
  let fresh = all.filter((e) => e.at > since);
  const cap = Math.max(1, Math.min(limit, 50));
  let more = false;
  if (fresh.length > cap) {
    // Cut after `cap` events, but never in the middle of events that share a time, or the next call would skip the rest of them.
    let end = cap;
    while (end < fresh.length && fresh[end]!.at === fresh[end - 1]!.at) end++;
    more = end < fresh.length;
    fresh = fresh.slice(0, end);
  }
  return { cursor: fresh.at(-1)?.at ?? since, events: fresh, more, waiting };
}
