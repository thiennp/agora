import { loadApp, type AppConfig } from "@/lib/app-config";
import { getAppStore } from "./apps";
import { loadEnv, requireRuntimeEnv } from "@/lib/env";
import { createSamClient } from "@/lib/meta";
import { metaClientFor } from "./meta";
import { createDealEventBus, type DealEventBus } from "@/hubs/DealEvents/command";
import { createCatalogService } from "@/features/catalog/public-api/infrastructure";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createIntake, createMetaPorts } from "@/features/intake/public-api/infrastructure";
import { createLanguageService } from "@/features/language/public-api/infrastructure";
import { createLearning } from "@/features/learning/public-api/infrastructure";
import { createLogistics, createSimulatedCarrier } from "@/features/logistics/public-api/infrastructure";
import { createMatchService } from "@/features/matching/public-api/infrastructure";
import { createLocalProvider } from "@/features/memory/public-api/infrastructure";
import { createNegotiationService, createRelay } from "@/features/negotiation/public-api/infrastructure";
import { createMandateBook, createMandateStore, createOwnerCards, eligibleStandingTopics } from "@/features/owner-cards/public-api/infrastructure";
import { createTrust } from "@/features/trust/public-api/infrastructure";
import { createStateScope, enterScope, tracked } from "@/lib/state";
import { getIdentityStore, isStoredApp } from "./identity";
import { backendFromEnv, type StateBackend } from "./persistence";

/**
 * Composition root: the one place that wires the slices together for one app. It lives in the entry layer so slices stay independent
 * of each other. Every party is a real member of that app (see `addMember`); the persona keys are only the names a route uses for
 * "the member acting", and both resolve to the signed-in member.
 */
export type PersonaKey = "a" | "b";

export interface Persona {
  key: PersonaKey;
  id: string;
  name: string;
  language: string;
  districtCode: string;
  availability: { from: string; to: string }[];
}

interface FeedItem {
  at: string;
  text: string;
}

interface Audit {
  gatekeeper: Record<string, number>;
  screening: Record<string, number>;
  relay: Record<string, number>;
  cards: Record<string, number>;
}

/**
 * One line of a member's own log: what their agent did, decided or asked, in plain words (BR-43, docs/PRIMITIVES.md §5). It holds a
 * short label, the deal it was about and nothing else: no message text, no other member's id, no address. Saved with the app's state.
 */
export interface MemberLogEntry {
  at: string;
  memberId: string;
  dealId?: string;
  kind: "listed" | "found" | "reached_out" | "approached" | "screened" | "asked" | "answered" | "agreed" | "decided" | "confirmed" | "ended" | "handoff" | "reported";
  text: string;
}

const LOG_KEEP = 2000;

const TOPIC_WORDS: Record<string, string> = { pickup_time_window: "a pickup time", price_terms: "terms", commitment: "agreeing", location_reveal: "a place", identity_reveal: "personal details", shipping_choice: "shipping" };

async function build(appId: string, opts: { fresh?: boolean } = {}) {
  const env = loadEnv();
  const secrets = process.env.NODE_ENV === "test" ? { FIELD_ENCRYPTION_SECRET: env.FIELD_ENCRYPTION_SECRET ?? "test-secret-0123456789abcdef", REPORT_EXPORT_SECRET: env.REPORT_EXPORT_SECRET ?? "test-export-0123456789abcdef" } : requireRuntimeEnv(env);
  getAppStore();
  const app: AppConfig = await loadApp(appId);
  if (!isStoredApp(appId)) throw new Error(`"${appId}" is not a stored app`);
  // An app starts empty: its stores, saved state and audit are its own and never see another app's data (BR-41).
  const who = {} as Record<PersonaKey, Persona>;
  // What the app lets owners offer: free where deals can be free, else swaps only.
  const terms = app.policies.pricing.mode === "swap_only" ? "swap" : "free";
  // Parties of this platform: nobody at first; members are added as they join (`addMember`), so a party is always a real membership of
  // this app and never another app's (docs/adr/0007).
  const byId = new Map<string, Persona>();
  const lang = (f: string) => byId.get(f)?.language ?? "en";

  // Everything the stores create from here until the seeding step is tracked, so it can be saved and restored (src/lib/state.ts).
  const scope = createStateScope();
  const leave = enterScope(scope);
  const feed = tracked("platform.feed", [] as FeedItem[]);
  const audit = tracked("platform.audit", { gatekeeper: {}, screening: {}, relay: {}, cards: {} } as Audit);
  const log = tracked("platform.log", [] as MemberLogEntry[]);
  const meta = tracked("platform.meta", {} as { dealId?: string; createdAt?: string });
  if (!meta.createdAt) meta.createdAt = new Date().toISOString();
  const bump = (m: Record<string, number>, k: string) => void (m[k] = (m[k] ?? 0) + 1);
  const say = (text: string) => void feed.unshift({ at: new Date().toISOString(), text });
  const nameOf = (f: string) => byId.get(f)?.name || "someone";
  const topicWord = (t: string) => TOPIC_WORDS[t] ?? t.replace(/_/g, " ");
  /** Append to a member's own log (newest last; the readers reverse it). Bounded so an app's state cannot grow without limit. */
  const record = (memberId: string, kind: MemberLogEntry["kind"], text: string, dealId?: string) => {
    log.push({ at: new Date().toISOString(), memberId, kind, text, ...(dealId ? { dealId } : {}) });
    if (log.length > LOG_KEEP) log.splice(0, log.length - LOG_KEEP);
  };
  /** The same line for both owners of a deal, once the deal is known. */
  const recordBoth = (dealId: string, kind: MemberLogEntry["kind"], text: string) =>
    void negotiation.get(dealId).then((d) => {
      if (!d) return;
      record(d.offerFamilyId, kind, text, dealId);
      record(d.wantFamilyId, kind, text, dealId);
    }).catch(() => undefined);

  const bus: DealEventBus = createDealEventBus();
  bus.subscribe("OwnerQuestionOpened", (e) => {
    say(`The agent paused and asked ${nameOf(e.familyId)} about ${topicWord(e.topic)}.`);
    record(e.familyId, "asked", `Would not decide ${topicWord(e.topic)} alone: asked you`, e.dealId);
  });
  bus.subscribe("OwnerAnswered", (e) => {
    say(`${nameOf(e.familyId)} answered ${e.answer}.`);
    record(e.familyId, "answered", `You answered ${e.answer} about ${topicWord(e.topic)}; your agent went on`, e.dealId);
  });
  bus.subscribe("DealAgreedByAgents", (e) => {
    say("The two agents agreed (not binding). Both owners now have a confirm card.");
    record(e.offerFamilyId, "agreed", "Agreed terms with the other agent (not binding) and asked you to confirm", e.dealId);
    record(e.wantFamilyId, "agreed", "Agreed terms with the other agent (not binding) and asked you to confirm", e.dealId);
  });
  bus.subscribe("OwnerDecision", (e) => {
    say(`${nameOf(e.familyId)} ${e.decision === "confirm" ? "confirmed" : "declined"}${e.reasonCode ? ` (${e.reasonCode.replace(/_/g, " ")})` : ""}.`);
    record(e.familyId, "decided", e.decision === "confirm" ? "You confirmed" : `You declined${e.reasonCode ? ` (${e.reasonCode.replace(/_/g, " ")}); your agent remembers that` : ""}`, e.dealId);
  });
  bus.subscribe("DealConfirmed", (e) => {
    say("Both owners confirmed. The handover plan opens.");
    recordBoth(e.dealId, "confirmed", "Both of you confirmed; your agent opened the handover plan");
  });
  bus.subscribe("DealDeclined", (e) => {
    say(`The deal ended: ${e.reason}.`);
    recordBoth(e.dealId, "ended", "The deal ended without a handover");
  });
  bus.subscribe("DealExpired", (e) => {
    say("The deal expired.");
    recordBoth(e.dealId, "ended", "The deal expired; nobody was committed");
  });
  bus.subscribe("HandoffProposed", (e) => {
    say(`A way to hand over was proposed: ${e.mode.replace(/_/g, " ")}.`);
    recordBoth(e.dealId, "handoff", `A handover by ${e.mode.replace(/_/g, " ")} was proposed; it waits for both of you`);
  });
  bus.subscribe("HandoffFinished", (e) => {
    say(e.ok ? "The item changed hands." : "The handover did not happen.");
    recordBoth(e.dealId, "handoff", e.ok ? "The handover happened" : "The handover did not happen");
  });
  bus.subscribe("ReportFiled", (e) => {
    say("A report was filed and the deal stopped.");
    recordBoth(e.dealId, "reported", "A problem was reported and the deal stopped");
  });

  const gatekeeper = createGatekeeper({ app, audit: (e) => bump(audit.gatekeeper, e.outcome) });
  const book = createMandateBook({ app, gatekeeper, store: createMandateStore() });
  for (const p of Object.values(who)) book.setLimits(p.id, { availability: p.availability, allowedTerms: [terms] });
  const catalog = createCatalogService({ app, canShare: (f) => byId.has(f) });

  // Translation and every other model call go to the real Meta Model API (Muse Spark).
  const client = metaClientFor(app);
  const language = createLanguageService({ app, client });
  const trust = createTrust({
    app, exportSecret: secrets.REPORT_EXPORT_SECRET,
    audit: (e) => {
      bump(audit.screening, e.decision);
      if (e.decision === "redact") record(e.familyId, "screened", `Removed ${e.kinds.map((k) => `a ${k.replace(/_/g, " ")}`).join(", ") || "a contact detail"} from a message before passing it on`, e.dealId);
      if (e.decision === "block") record(e.familyId, "screened", "Held back a message that looked unsafe", e.dealId);
    },
  });
  const negotiation = createNegotiationService({
    app, items: catalog.items, gatekeeper, bus, language, canStartDeal: (f) => trust.reputation.canStartDeal(f),
    mandateOf: (f) => book.negotiationMandate(f, lang(f)),
  });
  const relay = createRelay({ deals: negotiation, trust, gatekeeper, languageOf: lang, language, bus, audit: (e) => bump(audit.relay, e.status) });
  const cards = createOwnerCards({ app, negotiation, bus, mandates: book, languageOf: lang, language, audit: (e) => bump(audit.cards, e.action) });
  const memory = createLocalProvider();
  const learning = createLearning({
    app, memory, bus,
    dealInfo: async (id) => {
      const d = await negotiation.get(id);
      if (!d) return null;
      return { offerFamilyId: d.offerFamilyId, wantFamilyId: d.wantFamilyId, category: (await catalog.items.get(d.wantItemId))?.category };
    },
    rules: { eligibleTopics: () => eligibleStandingTopics(app), activeTopics: (f) => book.list(f).map((m) => m.topic), add: (i) => book.add(i) },
  });
  const logistics = createLogistics({
    app, deals: negotiation, carrier: createSimulatedCarrier(), secret: secrets.FIELD_ENCRYPTION_SECRET, bus,
    constraintsOf: (f) => ({ districtCode: byId.get(f)!.districtCode, availability: byId.get(f)!.availability }),
  });
  const matcher = createMatchService({ app, limitsOf: (f) => book.limitsOf(f) });
  // A member of a stored app becomes a party: the same agent wiring as the personas, with the app's first language, the one coarse
  // district every member shares until a location step exists, and a default pickup window (tomorrow) that owners can change.
  const addMember = (m: { id: string; name: string }): Persona => {
    const known = byId.get(m.id);
    if (known) return known;
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 1);
    const at = (h: number) => new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h)).toISOString();
    const persona: Persona = { key: "a", id: m.id, name: m.name, language: app.policies.languages[0] ?? "en", districtCode: "g:0.00:0.00", availability: [{ from: at(10), to: at(16) }] };
    byId.set(m.id, persona);
    const have = book.getLimits(m.id);
    if (!have.availability.some((w) => Date.parse(w.to) > Date.now())) book.setLimits(m.id, { ...have, availability: persona.availability, allowedTerms: [terms] });
    return persona;
  };
  // Photo intake: Muse Spark vision names the items and SAM 3.1 boxes them. Crops are not part of the saved state.
  const metaKey = process.env.NODE_ENV === "test" ? (env.META_API_KEY ?? "test-key") : requireRuntimeEnv(env).META_API_KEY;
  const intake = createIntake({
    catalog: app.catalog,
    ports: createMetaPorts({ catalog: app.catalog, sam: createSamClient({ baseUrl: env.META_API_URL ?? "https://api.meta.ai/v1", apiKey: metaKey }), client }),
  });
  leave();

  const backend: StateBackend | null = backendFromEnv(env, appId);
  const saved = opts.fresh ? null : await backend?.load();
  if (saved) scope.restore(saved);
  meta.createdAt ??= new Date().toISOString();

  // Saves are queued so two requests never write at once; a failed save is logged by name and does not fail the request.
  let tail: Promise<void> = Promise.resolve();
  const persist = (): Promise<void> => {
    if (!backend) return Promise.resolve();
    tail = tail.then(() => backend.save(scope.snapshot())).catch((e) => void console.error("state save failed", e instanceof Error ? e.name : typeof e));
    return tail;
  };
  await persist();

  return {
    app, personas: who, byId, addMember, bus, feed, audit, log, record, gatekeeper, book, catalog, negotiation, relay, cards, learning, logistics, trust, language, matcher, intake,
    createdAt: meta.createdAt!, persistence: (backend?.kind ?? "memory") as "memory" | "file" | "postgres", persist, restored: Boolean(saved),
    async wipe() {
      await tail;
      await backend?.clear();
      await backend?.close();
    },
  };
}

export type Platform = Awaited<ReturnType<typeof build>>;

const g = globalThis as unknown as { __agoraPlatforms?: Map<string, Promise<Platform>> };
const platforms = () => (g.__agoraPlatforms ??= new Map());

/** The running platform of one app, created on first use and kept for the life of the process. One per app, so stores never share data. */
export function getPlatform(appId: string): Promise<Platform> {
  const all = platforms();
  let p = all.get(appId);
  if (!p) {
    p = build(appId).catch((e) => {
      all.delete(appId);
      throw e;
    });
    all.set(appId, p);
  }
  return p.then(syncMembers);
}

/** Every membership of a stored app is a party of its platform (also after a restart, when only the identity store remembers them). */
async function syncMembers(p: Platform): Promise<Platform> {
  for (const m of await getIdentityStore().members(p.app.id)) p.addMember({ id: m.memberId, name: m.name });
  return p;
}

/** Start one app again from empty (its saved state is deleted and everything is replaced). Other apps are untouched. */
export async function resetPlatform(appId: string): Promise<Platform> {
  const all = platforms();
  const old = all.get(appId);
  if (old) await old.then((p: Platform) => p.wipe()).catch(() => undefined);
  const p = build(appId, { fresh: true }).catch((e) => {
    all.delete(appId);
    throw e;
  });
  all.set(appId, p);
  return p;
}
