import { simulatedDropPoints } from "@/features/logistics/public-api/infrastructure";
import type { Platform, Persona, PersonaKey } from "./platform";

/** View models for the pages: plain data, no slice types leaking into components. */

/** Which persona a page is shown as: anything but "b" is Mia. */
export const asKey = (v: unknown): PersonaKey => (v === "b" ? "b" : "a");
export const personaOf = (p: Platform, key: PersonaKey): Persona => p.personas[key];
export const otherOf = (p: Platform, key: PersonaKey): Persona => p.personas[key === "a" ? "b" : "a"];

const TRANSITION: Record<string, string> = {
  proposed: "an offer was made", countered: "the agents negotiated", agreed_by_agents: "the agents agreed (not binding)", awaiting_owner_input: "an owner was asked a question",
  awaiting_owners: "waiting for both owners", confirmed: "both owners confirmed", declined: "the deal was declined", expired: "the deal expired", handoff: "arranging the handover",
  completed: "the item changed hands", not_completed: "the handover did not happen", reported: "the deal was reported",
};

async function itemText(p: Platform, itemId: string): Promise<string> {
  const i = await p.catalog.items.get(itemId);
  if (!i) return "an item";
  return [i.description || i.category, i.category, i.size ? `size ${i.size}` : null, i.condition].filter(Boolean).join(" · ");
}

export async function ownerView(p: Platform, key: PersonaKey) {
  const me = personaOf(p, key);
  await p.cards.settled();
  const questions = p.cards.questionsFor(me.id).map((q) => ({ id: q.id, dealId: q.dealId, text: q.text, answers: q.suggestedAnswers, canRemember: q.canRemember, language: q.language, expiresAt: q.expiresAt }));
  const confirmations = await Promise.all(
    p.cards.confirmationsFor(me.id).map(async (c) => {
      const d = await p.negotiation.get(c.dealId);
      return { id: c.id, dealId: c.dealId, item: d ? await itemText(p, d.offerItemId) : "an item", role: d?.offerFamilyId === me.id ? "giving" : "receiving" };
    }),
  );
  const lessons = await p.learning.whatILearned(me.id);
  const rules = p.book.list(me.id).map((r) => ({ id: r.id, topic: r.topic.replace(/_/g, " "), expiresAt: r.expiresAt }));
  const stretch = p.learning.stretchOffersFor(me.id).map((o) => ({ id: o.id, text: o.text }));
  const proposals = p.learning.proposalsFor(me.id).map((o) => ({ id: o.id, text: o.text }));
  return { persona: me, questions, confirmations, lessons, rules, stretch, proposals, pending: questions.length + confirmations.length };
}

export async function dealList(p: Platform, key: PersonaKey) {
  const me = personaOf(p, key);
  const deals = await p.negotiation.listForFamily(me.id);
  return Promise.all(
    deals.map(async (d) => ({
      id: d.id, state: d.state, role: d.offerFamilyId === me.id ? "giving" : "receiving", item: await itemText(p, d.offerItemId),
      summary: await p.negotiation.summary(d.id), updatedAt: d.updatedAt,
    })),
  );
}

export async function dealView(p: Platform, dealId: string, key: PersonaKey) {
  const me = personaOf(p, key);
  const d = await p.negotiation.get(dealId);
  if (!d || (d.offerFamilyId !== me.id && d.wantFamilyId !== me.id)) return null;
  const offers = (await p.negotiation.transcriptFor(dealId, me.id)).map((m) => ({
    round: m.round, fromMe: m.fromFamilyId === me.id, terms: m.offer.terms, window: m.offer.pickupWindow ?? null, note: m.note, noteLang: m.noteLang,
    translated: m.translatedNote?.text ?? null, translationFailed: Boolean(m.translationFailed),
  }));
  const conversation = await p.relay.conversationFor(dealId, me.id);
  const signals = await p.relay.signalsAbout(dealId, me.id);
  return {
    persona: me, other: p.byId.get(d.offerFamilyId === me.id ? d.wantFamilyId : d.offerFamilyId) ?? otherOf(p, key),
    deal: { id: d.id, state: d.state, round: d.round, maxRounds: d.maxRounds, role: d.offerFamilyId === me.id ? "giving" : "receiving", flags: d.flags, expiresAt: d.expiresAt },
    summary: await p.negotiation.summary(dealId), item: await itemText(p, d.offerItemId),
    history: d.history
      .filter((h, i, all) => i === 0 || all[i - 1]!.to !== h.to)
      .map((h) => ({ to: h.to, text: TRANSITION[h.to] ?? h.to, at: h.at })),
    offers, conversation, handoff: await p.logistics.handoffCard(dealId, me.id), modes: p.app.policies.handoffModes, dropPoints: simulatedDropPoints(p.personas.a.districtCode).map(({ id, name }) => ({ id, name })), signals,
  };
}

export type OwnerView = Awaited<ReturnType<typeof ownerView>>;
export type DealView = NonNullable<Awaited<ReturnType<typeof dealView>>>;
export type DealListItem = Awaited<ReturnType<typeof dealList>>[number];

/** An item as the matcher indexes it. */
export function indexedItem(p: Platform, i: { id: string; familyId: string; kind: "offer" | "want"; category: string; size?: string; condition?: string; createdAt: string }) {
  return { id: i.id, appId: p.app.id, createdAt: i.createdAt, familyId: i.familyId, kind: i.kind, category: i.category, size: i.size, condition: i.condition, districtCode: p.byId.get(i.familyId)!.districtCode };
}

const itemLabel = (p: Platform, i: { category: string; size?: string; description: string }) =>
  [i.description || (p.app.catalog.categories.find((c) => c.id === i.category)?.label ?? i.category), i.size ? `size ${i.size}` : null].filter(Boolean).join(" · ");

/** The owner's items, and for each listed want the offers the matcher finds (never anything but listed items of others). */
export async function itemsView(p: Platform, key: PersonaKey) {
  const me = personaOf(p, key);
  const mine = (await p.catalog.items.listForFamily(me.id)).filter((i) => i.status !== "withdrawn" && i.status !== "done");
  const items = await Promise.all(
    mine.map(async (i) => {
      let matches: { offerItemId: string; text: string; reason: string }[] = [];
      let emptyReason: string | undefined;
      if (i.kind === "want" && i.status === "listed") {
        const r = p.matcher.candidatesFor(indexedItem(p, i));
        emptyReason = r.emptyReason;
        matches = await Promise.all(
          r.matches.map(async (m) => {
            const o = await p.catalog.items.get(m.offerItemId);
            return { offerItemId: m.offerItemId, text: o ? itemLabel(p, o) : "an item", reason: m.reason };
          }),
        );
      }
      return { id: i.id, kind: i.kind, text: itemLabel(p, i), category: i.category, condition: i.condition ?? null, status: i.status, flags: i.safetyFlags.map((f) => f.advice), matches, emptyReason, crop: p.intake.crops.forItem(i.id) ?? null };
    }),
  );
  const cfg = p.app.catalog;
  return {
    persona: me,
    items,
    options: { categories: cfg.categories.map((c) => ({ id: c.id, label: c.label })), sizes: cfg.sizeSystems, conditions: cfg.conditions },
  };
}
