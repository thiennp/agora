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

export interface MemberStatus {
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

export type MemberStatusView = { kind: "denied" } | { kind: "ok"; status: MemberStatus };

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

