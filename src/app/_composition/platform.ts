import { loadApp, type AppConfig } from "@/lib/app-config";
import { loadEnv } from "@/lib/env";
import { CostMeter, createMetaClient, createMockAdapter, createRouter } from "@/lib/meta";
import { createDealEventBus, type DealEventBus } from "@/hubs/DealEvents/command";
import { createCatalogService } from "@/features/catalog/public-api/infrastructure";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createLanguageService } from "@/features/language/public-api/infrastructure";
import { createLearning } from "@/features/learning/public-api/infrastructure";
import { createLogistics, createSimulatedCarrier } from "@/features/logistics/public-api/infrastructure";
import { createMatchService } from "@/features/matching/public-api/infrastructure";
import { createLocalProvider } from "@/features/memory/public-api/infrastructure";
import { createNegotiationService, createRelay } from "@/features/negotiation/public-api/infrastructure";
import { createMandateBook, createMandateStore, createOwnerCards, eligibleStandingTopics } from "@/features/owner-cards/public-api/infrastructure";
import { createTrust } from "@/features/trust/public-api/infrastructure";

/**
 * Composition root of the demo: the one place that wires the slices together and seeds a scenario. It lives in the entry layer so
 * slices stay independent of each other. Demo mode only: there are no accounts, so the two personas are not real users.
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

export interface FeedItem {
  at: string;
  text: string;
}

export interface Audit {
  gatekeeper: Record<string, number>;
  screening: Record<string, number>;
  relay: Record<string, number>;
  cards: Record<string, number>;
}

const DEMO_SECRET = "demo-only-secret-key-0123456789";
const TOPIC_WORDS: Record<string, string> = { pickup_time_window: "a pickup time", price_terms: "terms", commitment: "agreeing", location_reveal: "a place", identity_reveal: "personal details", shipping_choice: "shipping" };

function personas(): Record<PersonaKey, Persona> {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 1);
  const at = (h: number) => new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h)).toISOString();
  return {
    a: { key: "a", id: "demo-mia", name: "Mia", language: "en", districtCode: "g:52.50:13.40", availability: [{ from: at(10), to: at(14) }] },
    b: { key: "b", id: "demo-jonas", name: "Jonas", language: "de", districtCode: "g:52.50:13.45", availability: [{ from: at(11), to: at(16) }] },
  };
}

async function build() {
  const env = loadEnv();
  if (env.MODE === "live") throw new Error("the demo console is not available in live mode: there are no accounts yet");
  const app: AppConfig = await loadApp(env.APP);
  if (app.policies.pricing.mode === "swap_only") throw new Error("the demo needs an app whose deals can be free");
  const who = personas();
  const byId = new Map(Object.values(who).map((p) => [p.id, p]));
  const lang = (f: string) => byId.get(f)?.language ?? "en";

  const feed: FeedItem[] = [];
  const audit: Audit = { gatekeeper: {}, screening: {}, relay: {}, cards: {} };
  const bump = (m: Record<string, number>, k: string) => void (m[k] = (m[k] ?? 0) + 1);
  const say = (text: string) => void feed.unshift({ at: new Date().toISOString(), text });
  const nameOf = (f: string) => byId.get(f)?.name ?? "someone";

  const bus: DealEventBus = createDealEventBus();
  bus.subscribe("OwnerQuestionOpened", (e) => say(`The agent paused and asked ${nameOf(e.familyId)} about ${TOPIC_WORDS[e.topic] ?? e.topic}.`));
  bus.subscribe("OwnerAnswered", (e) => say(`${nameOf(e.familyId)} answered ${e.answer}.`));
  bus.subscribe("DealAgreedByAgents", () => say("The two agents agreed (not binding). Both owners now have a confirm card."));
  bus.subscribe("OwnerDecision", (e) => say(`${nameOf(e.familyId)} ${e.decision === "confirm" ? "confirmed" : "declined"}${e.reasonCode ? ` (${e.reasonCode.replace(/_/g, " ")})` : ""}.`));
  bus.subscribe("DealConfirmed", () => say("Both owners confirmed. The handover plan opens."));
  bus.subscribe("DealDeclined", (e) => say(`The deal ended: ${e.reason}.`));
  bus.subscribe("DealExpired", () => say("The deal expired."));
  bus.subscribe("HandoffProposed", (e) => say(`A way to hand over was proposed: ${e.mode.replace(/_/g, " ")}.`));
  bus.subscribe("HandoffFinished", (e) => say(e.ok ? "The item changed hands." : "The handover did not happen."));
  bus.subscribe("ReportFiled", () => say("A report was filed and the deal stopped."));

  const gatekeeper = createGatekeeper({ app, audit: (e) => bump(audit.gatekeeper, e.outcome) });
  const book = createMandateBook({ app, gatekeeper, store: createMandateStore() });
  for (const p of Object.values(who)) book.setLimits(p.id, { availability: p.availability, allowedTerms: ["free"] });
  const catalog = createCatalogService({ app, canShare: (f) => byId.has(f) });

  // No model key in the demo: translation is a clearly labelled simulation, so the relay path is real but the words are not.
  const client = createMetaClient({
    app,
    adapters: {
      mock: createMockAdapter((req) => {
        const to = /into language "([a-z]{2})"/.exec(req.system)?.[1] ?? "en";
        const text = (JSON.parse(req.prompt) as { text?: string }).text ?? "";
        return JSON.stringify({ translation: `[simulated ${to}] ${text}`, confidence: 0.9 });
      }),
    },
    router: createRouter({ providers: { "muse-spark": "mock", "muse-spark-open": "mock" } }),
    meter: new CostMeter({ perParticipantUsd: 1, globalUsd: 50 }),
  });
  const language = createLanguageService({ app, client });
  const trust = createTrust({ app, exportSecret: DEMO_SECRET, audit: (e) => bump(audit.screening, e.decision) });
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
    app, deals: negotiation, carrier: createSimulatedCarrier(), secret: DEMO_SECRET, bus,
    constraintsOf: (f) => ({ districtCode: byId.get(f)!.districtCode, availability: byId.get(f)!.availability }),
  });
  const matcher = createMatchService({ app, limitsOf: (f) => book.limitsOf(f) });

  // The scenario: Mia offers a winter jacket, Jonas needs one. The match, the offer and the agents' first moves are all real.
  const mia = who.a;
  const jonas = who.b;
  const offer = await catalog.items.create(mia.id, { kind: "offer", category: "clothing", size: "68", condition: "good", description: "Winter jacket" });
  const want = await catalog.items.create(jonas.id, { kind: "want", category: "clothing", size: "68" });
  await catalog.items.list(offer.id);
  await catalog.items.list(want.id);
  const common = { appId: app.id, createdAt: new Date().toISOString() };
  matcher.onListed({ ...common, id: offer.id, familyId: mia.id, kind: "offer", category: "clothing", size: "68", condition: "good", districtCode: mia.districtCode });
  const found = matcher.candidatesFor({ ...common, id: want.id, familyId: jonas.id, kind: "want", category: "clothing", size: "68", districtCode: jonas.districtCode });
  say(`${nameOf(jonas.id)}'s agent found a match: ${found.matches[0]?.reason ?? "none"}`);
  const deal = await negotiation.start({ offerItemId: offer.id, wantItemId: want.id, offerFamilyId: mia.id, wantFamilyId: jonas.id });
  await negotiation.run(deal.id);
  await cards.settled();

  return {
    app, personas: who, byId, bus, feed, audit, gatekeeper, book, catalog, negotiation, relay, cards, learning, logistics, trust, language, matcher, dealId: deal.id,
    createdAt: new Date().toISOString(),
  };
}

export type Platform = Awaited<ReturnType<typeof build>>;

const g = globalThis as unknown as { __agoraPlatform?: Promise<Platform> };

/** The running demo, created on first use and kept for the life of the process. */
export function getPlatform(): Promise<Platform> {
  return (g.__agoraPlatform ??= build().catch((e) => {
    g.__agoraPlatform = undefined;
    throw e;
  }));
}

/** Start the scenario again from the beginning (everything in memory is replaced). */
export function resetPlatform(): Promise<Platform> {
  g.__agoraPlatform = undefined;
  return getPlatform();
}
