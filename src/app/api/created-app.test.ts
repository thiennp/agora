import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The pages read the session cookie from the request and call notFound(); outside a request both are stood in for here.
let cookie = "";
let path = "/app/walk-club";
vi.mock("next/headers", () => ({ cookies: async () => ({ toString: () => cookie }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ refresh() {}, push() {} }),
  usePathname: () => path,
  useSearchParams: () => new URLSearchParams(),
}));

import { resetRateLimit } from "@/app/_composition/api";
import { useAppStore } from "@/app/_composition/apps";
import { useIdentityStore, useMuseKeyStore } from "@/app/_composition/identity";
import { resetInterviewLimits, useInterviewModel } from "@/app/_composition/interview";
import { memberStatusView } from "@/app/_composition/member-status";
import { getPlatform } from "@/app/_composition/platform";
import { resetMuseRateLimits } from "@/app/_composition/muse-api";
import { appAgentBrief, appVocabulary, createAppStore, createMemoryBackend, describeApp, loadApp, repoAppIds } from "@/lib/app-config";
import { createIdentityStore, createMuseKeyStore } from "@/lib/identity";
import AppLayout from "@/app/app/[app]/layout";
import ItemsPage from "@/app/app/[app]/items/page";
import CardsPage from "@/app/app/[app]/cards/page";
import DealsPage from "@/app/app/[app]/deals/page";
import DealPage from "@/app/app/[app]/deals/[dealId]/page";
import AppPage from "@/app/app/[app]/page";
import StatusPage from "@/app/app/[app]/muse/[id]/page";
import DemoItemsPage from "@/app/(owner)/items/page";
import DemoCardsPage from "@/app/(owner)/cards/page";
import DemoDealsPage from "@/app/(owner)/deals/page";
import { GET as agentMd } from "@/app/app/[app]/agent.md/route";
import { Nav } from "@/components/Nav";
import { POST as interview } from "./interview/route";
import { POST as build } from "./interview/build/route";
import { POST as join } from "./apps/[app]/join/route";
import { POST as addItem } from "./items/route";
import { POST as startDeal } from "./matches/start/route";
import { POST as answerQuestion } from "./owner-questions/[questionId]/answer/route";
import { POST as decide } from "./deals/[dealId]/confirm/route";
import { POST as relay } from "./deals/[dealId]/relay/route";
import { GET as dealGet } from "./deals/[dealId]/route";

/**
 * A created app is usable end to end in mock mode (docs/PLAN.md §2c-quater): interview draft, build, two people post, the matcher finds
 * the match, a deal is proposed, each owner answers their own cards with their own session, both confirm, and the deal room works.
 * Every page is rendered the way a person sees it. Strangers and other members are refused, an unknown app is a 404, and the repository
 * app's demo pages are unchanged.
 */
(globalThis as { React?: typeof React }).React = React;

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) as Promise<any> });
const post = (path: string, body: unknown, headers: Record<string, string> = {}) => new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers });
const get = (path: string, headers: Record<string, string> = {}) => new Request(`http://localhost${path}`, { headers });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;
const j = async (r: Response) => (await r.json()) as any;

/** Resolve an async server component one level at a time, then render it to markup. */
async function render(node: any): Promise<string> {
  let el = node;
  while (el && typeof el.type === "function" && el.type.constructor.name === "AsyncFunction") el = await el.type(el.props);
  return renderToStaticMarkup(el);
}
const as = async (who: string, page: (p: any) => Promise<any>, params: Record<string, string>) => {
  cookie = who;
  const el = await page({ params: Promise.resolve(params) });
  return render(el);
};

const answers = [
  { step: "purpose", choice: "organise" },
  { step: "actions", text: "Post a walk, ask to join a walk" },
  { step: "how", text: "People post a walk, others ask to join" },
  { step: "care", choice: "none" },
  { step: "name", text: "Walk Club" },
  { step: "feel", choice: "friendly" },
];
const appId = "walk-club";
const EXCHANGE_WORDS = /\b(swap|swapped|free|handover|hand over|giving|looking for|family|families|city)\b/i;

describe("a created app is usable end to end", () => {
  beforeEach(() => {
    cookie = "";
    resetRateLimit();
    resetInterviewLimits();
    resetMuseRateLimits();
    useInterviewModel(undefined);
    useIdentityStore(createIdentityStore());
    useMuseKeyStore(createMuseKeyStore());
    useAppStore(createAppStore(createMemoryBackend(), { reserved: repoAppIds() }));
  });

  async function create() {
    const review = await j(await interview(post("/api/interview", { answers }), ctx()));
    expect(review.kind).toBe("review");
    const built = await build(post("/api/interview/build", { draft: review.draft }), ctx());
    expect(built.status).toBe(200);
    const creatorCookie = cookieOf(built);
    const creator = { cookie: creatorCookie, memberId: (await j(await join(post(`/api/apps/${appId}/join`, {}, { cookie: creatorCookie }), ctx({ app: appId })))).memberId as string };
    const joined = await join(post(`/api/apps/${appId}/join`, { name: "Bo" }), ctx({ app: appId }));
    const bo = { cookie: cookieOf(joined), memberId: (await j(joined)).memberId as string };
    const joinedC = await join(post(`/api/apps/${appId}/join`, { name: "Cy" }), ctx({ app: appId }));
    const cy = { cookie: cookieOf(joinedC), memberId: (await j(joinedC)).memberId as string };
    return { creator, bo, cy };
  }
  const api = (who: { cookie: string }, path: string, body: unknown) => post(`${path}${path.includes("?") ? "&" : "?"}app=${appId}`, { as: "a", ...(body as object) }, { cookie: who.cookie });

  it("goes from the interview draft to a conversation in the deal room, with the app's own words and every owner tap their own", async () => {
    const { creator, bo, cy } = await create();
    const config = await loadApp(appId);
    const cat = config.catalog.categories[0]!.id;
    const w = appVocabulary(config);
    expect(w.style).toBe("board");

    // The person's pages are there, and say nothing about swapping, free things, handover or cities.
    const empty = await as(bo.cookie, ItemsPage, { app: appId });
    expect(empty).toContain("Your posts");
    expect(empty).toContain("Add a post");
    expect(empty).not.toMatch(EXCHANGE_WORDS);
    expect(empty).not.toMatch(/Mia|Jonas|Cards<|Dashboard/);
    expect(await as(bo.cookie, DealsPage, { app: appId })).toContain("Your conversations");

    // Person A (the creator) posts an offer, person B posts a need; B's page shows the matcher's candidate.
    const offer = await j(await addItem(api(creator, "/api/items", { kind: "offer", category: cat, condition: "good", description: "Saturday walk at nine" }), ctx()));
    const want = await j(await addItem(api(bo, "/api/items", { kind: "want", category: cat, description: "A walk to join" }), ctx()));
    const itemsB = await as(bo.cookie, ItemsPage, { app: appId });
    expect(itemsB).toContain("You need: A walk to join");
    expect(itemsB).toContain("Your agent found a post that fits");
    expect(itemsB).toContain("Saturday walk at nine");
    expect(itemsB).toContain("Ask my agent to reach out");
    expect(itemsB).not.toMatch(EXCHANGE_WORDS);
    // A stranger's and another member's view never contain B's post.
    expect(await as(cy.cookie, ItemsPage, { app: appId })).not.toContain("A walk to join");

    // B asks their agent to reach out; the agents run until the offering owner has to decide.
    const started = await startDeal(api(bo, "/api/matches/start", { wantItemId: want.id, offerItemId: offer.id }), ctx());
    expect(started.status).toBe(200);
    const { dealId } = await j(started);
    const status = async (who: typeof bo) => {
      const s = await memberStatusView(appId, who.memberId, who.cookie);
      if (s.kind !== "ok") throw new Error("denied");
      return s.status;
    };
    expect((await status(creator)).waiting.questions).toHaveLength(1);
    const cardsA = await as(creator.cookie, CardsPage, { app: appId });
    expect(cardsA).toContain("Your agent needs you");
    expect(await as(bo.cookie, CardsPage, { app: appId })).not.toContain("Your agent needs you");
    expect(await as(cy.cookie, CardsPage, { app: appId })).not.toContain("Your agent needs you");

    // Each owner answers their own cards with their own session; nobody can answer another's.
    const qid = (await status(creator)).waiting.questions[0]!.id;
    expect((await answerQuestion(api(bo, `/api/owner-questions/${qid}/answer`, { answer: "yes" }), ctx({ questionId: qid }))).status).toBe(403);
    expect((await answerQuestion(api(creator, `/api/owner-questions/${qid}/answer`, { answer: "yes" }), ctx({ questionId: qid }))).status).toBe(200);
    for (let i = 0; i < 4; i++) {
      for (const who of [bo, creator]) {
        const q = (await status(who)).waiting.questions[0];
        if (q) await answerQuestion(api(who, `/api/owner-questions/${q.id}/answer`, { answer: "yes" }), ctx({ questionId: q.id }));
      }
    }
    const conf = { a: (await status(creator)).waiting.confirmations, b: (await status(bo)).waiting.confirmations };
    expect(conf.a).toHaveLength(1);
    expect(conf.b).toHaveLength(1);
    expect(await as(bo.cookie, CardsPage, { app: appId })).toContain("Confirm this deal?");
    // Only after both confirm is the deal confirmed.
    expect((await decide(api(creator, `/api/deals/${dealId}/confirm`, { cardId: conf.a[0]!.id, decision: "confirm" }), ctx({ dealId }))).status).toBe(200);
    expect((await dealGet(get(`/api/deals/${dealId}?app=${appId}`, { cookie: bo.cookie }), ctx({ dealId }))).status).toBe(200);
    expect((await decide(api(bo, `/api/deals/${dealId}/confirm`, { cardId: conf.b[0]!.id, decision: "confirm" }), ctx({ dealId }))).status).toBe(200);

    // The deal room: both parties see it, with the app's words, and chat through the relay. The third member and a stranger get the not-found page.
    for (const who of [creator, bo]) {
      const room = await as(who.cookie, DealPage, { app: appId, dealId });
      expect(room).toContain("Meeting up");
      expect(room).toContain("You never write to the other person directly");
      expect(room).not.toMatch(EXCHANGE_WORDS);
      expect(await as(who.cookie, DealsPage, { app: appId })).toContain("Open the conversation");
    }
    await expect(as(cy.cookie, DealPage, { app: appId, dealId })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(as("", DealPage, { app: appId, dealId })).rejects.toThrow("NEXT_NOT_FOUND");
    const said = await relay(api(bo, `/api/deals/${dealId}/relay`, { text: "Shall we meet at the park gate?" }), ctx({ dealId }));
    expect(said.status).toBe(200);
    expect(await as(creator.cookie, DealPage, { app: appId, dealId })).toContain("park gate");
    expect((await relay(api(cy, `/api/deals/${dealId}/relay`, { text: "hello" }), ctx({ dealId }))).status).toBe(403);
    // The message text is on the deal room only; the status page holds decisions and counts, and links to the room.
    const statusHtml = await as(bo.cookie, StatusPage, { app: appId, id: bo.memberId });
    expect(statusHtml).not.toContain("park gate");
    expect(statusHtml).toContain(`/app/${appId}/deals/${dealId}`);
    expect(statusHtml).toContain("Conversations");
  });

  it("refuses strangers and other members everywhere, and an unknown app is a real not-found", async () => {
    const { creator, bo } = await create();
    // No session: every person's page is a 404, not an invitation to log in (the public page is the only open one).
    for (const page of [ItemsPage, CardsPage, DealsPage]) await expect(as("", page, { app: appId })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(as("", StatusPage, { app: appId, id: bo.memberId })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(as(creator.cookie, StatusPage, { app: appId, id: bo.memberId })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await as("", AppPage, { app: appId })).toContain("What it does not do");
    // A session of one app is nothing in another app.
    await expect(as(bo.cookie, ItemsPage, { app: "kids-gear" })).rejects.toThrow("NEXT_NOT_FOUND");
    // Unknown app: the layout, the page and agent.md all say not found; the API says 404 too.
    await expect(AppLayout({ children: null, params: Promise.resolve({ app: "nope-nope" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(as("", AppPage, { app: "nope-nope" })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(as("", ItemsPage, { app: "nope-nope" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await agentMd(get("/app/nope-nope/agent.md"), ctx({ app: "nope-nope" }))).status).toBe(404);
    expect((await addItem(post("/api/items?app=nope-nope", { as: "a", kind: "want", category: "x" }), ctx())).status).toBe(404);
    expect((await addItem(post(`/api/items?app=${appId}`, { as: "a", kind: "want", category: "x" }), ctx())).status).toBe(401);
  });

  it("says plainly what the app does and does not do, in the creator's own words", async () => {
    await create();
    const config = await loadApp(appId);
    const d = describeApp(config);
    const text = [d.purpose, ...d.features, ...d.rules].join("\n");
    expect(text).not.toMatch(EXCHANGE_WORDS);
    expect(d.limits.join(" ")).toMatch(/no events, calendar, sign-up or RSVP/);
    const brief = appAgentBrief({ id: appId, name: config.name, region: config.region.name, participant: config.participant.noun, languages: ["en"] }, d, "https://x.test");
    expect(brief).toContain("What it does not do");
    const md = await (await agentMd(get(`/app/${appId}/agent.md`), ctx({ app: appId }))).text();
    expect(md).toContain("they post what they offer or need");
    // An exchange app keeps the exchange words, because its config has them.
    const ex = describeApp({ ...config, policies: { ...config.policies, pricing: { mode: "free_or_agreement" }, handoffModes: ["pickup", "shipping"] } });
    expect(ex.features.join(" ")).toContain("Handover by");
  });

  it("leaves the repository app's demo pages and routes as they were", async () => {
    const p = await getPlatform();
    expect(p.app.id).toBe("kids-gear");
    for (const page of [DemoItemsPage, DemoCardsPage, DemoDealsPage]) {
      const html = await render(await page({ searchParams: Promise.resolve({ as: "b" }) } as any));
      expect(html).toContain("Jonas");
    }
    expect(await render(await DemoItemsPage({ searchParams: Promise.resolve({ as: "a" }) }))).toContain("Your items");
    expect(await render(await DemoDealsPage({ searchParams: Promise.resolve({}) }))).toContain("Open the deal room");
    // The demo navigation is for the demo; inside an app it is replaced by the app's own bar.
    const inApp = renderToStaticMarkup(React.createElement(Nav));
    expect(inApp).not.toMatch(/Mia|Jonas|Dashboard|Styleguide|Items|Deals/);
    path = "/items";
    expect(renderToStaticMarkup(React.createElement(Nav))).toMatch(/Mia[\s\S]*Jonas/);
    path = "/app/walk-club";
  });
});
