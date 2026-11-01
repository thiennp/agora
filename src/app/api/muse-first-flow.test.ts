import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import { appPageView } from "@/app/_composition/app-views";
import { memberStatusView } from "@/app/_composition/member-status";
import { appUrl, startBriefUrl, startUrl } from "@/app/_composition/public-url";
import { loadApp } from "@/lib/app-config";
import { POST as interview } from "./interview/route";
import { POST as build } from "./interview/build/route";
import { POST as join } from "./apps/[app]/join/route";
import { POST as makeKey } from "./apps/[app]/muse-key/route";
import { POST as addItem } from "./items/route";
import { POST as startDeal } from "./matches/start/route";
import { POST as answerQuestion } from "./owner-questions/[questionId]/answer/route";
import { POST as decide } from "./deals/[dealId]/confirm/route";
import { GET as dealsList } from "./deals/route";
import * as overviewRoute from "./muse/[app]/overview/route";
import * as statusRoute from "./muse/[app]/status/route";
import * as actionsRoute from "./muse/[app]/actions/route";
import * as cardsRoute from "./muse/[app]/cards/route";
import * as mcpRoute from "./muse/[app]/mcp/route";
import { endWorld, resetWorld } from "./test-support";

/**
 * The whole Muse-first demo in mock mode, end to end through the real routes (docs/PLAN.md §2c step 7): the copy-paste home page, the
 * /start interview, the app being created, its overview and invite, a second person joining, the member status page showing real
 * data, and a person's own Muse reading it with a member key and being unable to answer anything. No model, no network.
 */
// The page components use the automatic JSX runtime, which the plain vitest transform does not set up.
(globalThis as { React?: typeof React }).React = React;

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) as Promise<any> });
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers });
const get = (path: string, headers: Record<string, string> = {}) => new Request(`http://localhost${path}`, { headers });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;
const j = async (r: Response) => (await r.json()) as any;

const answers = [
  { step: "purpose", choice: "exchange" },
  { step: "actions", text: "Offer clothes, shoes and bags" },
  { step: "how", text: "People post what they have, others ask, then they agree" },
  { step: "care", choice: "none" },
  { step: "name", text: "Clothes Swap Club" },
  { step: "feel", choice: "friendly" },
];

describe("Muse-first flow, end to end with the model stood in", () => {
  afterEach(endWorld);
  beforeEach(() => resetWorld());

  it("goes from the pasted prompt to a Muse reading a member's real status, and nothing a Muse holds can answer a card", async () => {
    // 1. The home page is one copy-paste message that opens the assistant brief, /start/agent.md.
    const home = renderToStaticMarkup(React.createElement(Home));
    expect(startUrl).toBe("https://agentwitch.com/agora/start");
    expect(startBriefUrl).toBe(`${startUrl}/agent.md`);
    expect(home).toContain(startBriefUrl);
    expect(home).not.toMatch(/QR code/i);
    expect(home).toContain("Copy");

    // 2. The interview asks every question, then shows a review; one yes stores the app and makes the caller its creator.
    for (let i = 0; i < answers.length; i++) {
      const t = await j(await interview(post("/api/interview", { answers: answers.slice(0, i) }), ctx()));
      expect(t).toMatchObject({ kind: "ask", question: { step: answers[i]!.step } });
    }
    const review = await j(await interview(post("/api/interview", { answers }), ctx()));
    expect(review.kind).toBe("review");
    const built = await build(post("/api/interview/build", { draft: review.draft }), ctx());
    expect(built.status).toBe(200);
    const created = await j(built);
    const appId = "clothes-swap-club";
    expect(created).toMatchObject({ path: `/app/${appId}`, role: "creator" });
    const creator = { cookie: cookieOf(built), memberId: (await j(await join(post(`/api/apps/${appId}/join`, {}, { cookie: cookieOf(built) }), ctx({ app: appId })))).memberId as string };

    // 3. The overview shows the creator the member list; the invite is the app's own address and holds no secret.
    expect(appUrl(appId)).toBe(`https://agentwitch.com/agora/app/${appId}`);
    const asCreator = await appPageView(appId, creator.cookie);
    expect(asCreator.kind).toBe("creator");
    expect((await appPageView(appId, null)).kind).toBe("stranger");

    // 4. A second person scans the invite and joins; they are a member, not a creator, and the creator sees them.
    const joined = await join(post(`/api/apps/${appId}/join`, { name: "Bo" }), ctx({ app: appId }));
    const bo = { cookie: cookieOf(joined), ...(await j(joined)) } as { cookie: string; memberId: string };
    expect((await appPageView(appId, bo.cookie)).kind).toBe("member");
    const afterJoin = await appPageView(appId, creator.cookie);
    if (afterJoin.kind !== "creator") throw new Error("not creator");
    expect(afterJoin.members.map((m) => m.name)).toContain("Bo");

    // 5. Both are real parties of the app's platform: the creator offers something, Bo wants it, Bo's agent opens a deal.
    const cat = (await loadApp(appId)).catalog.categories[0]!.id;
    const offer = await j(await addItem(post(`/api/items?app=${appId}`, { as: "a", kind: "offer", category: cat, condition: "good", description: "Red scarf" }, { cookie: creator.cookie }), ctx()));
    const want = await j(await addItem(post(`/api/items?app=${appId}`, { as: "a", kind: "want", category: cat }, { cookie: bo.cookie }), ctx()));
    expect(offer.id && want.id).toBeTruthy();
    const started = await startDeal(post(`/api/matches/start?app=${appId}`, { as: "a", wantItemId: want.id, offerItemId: offer.id }, { cookie: bo.cookie }), ctx());
    expect(started.status).toBe(200);
    const { dealId } = await j(started);

    // 6. Bo's status page shows real data: the item, the deal, and whatever now waits on Bo.
    const status = await memberStatusView(appId, bo.memberId, bo.cookie);
    if (status.kind !== "ok") throw new Error("denied");
    expect(status.status.member).toMatchObject({ name: "Bo", role: "member" });
    expect(status.status.items.map((i) => i.kind)).toEqual(["want"]);
    expect(status.status.deals.map((d) => d.id)).toEqual([dealId]);
    const theirs = await memberStatusView(appId, creator.memberId, creator.cookie);
    if (theirs.kind !== "ok") throw new Error("denied");
    expect(theirs.status.items.map((i) => i.kind)).toEqual(["offer"]);
    expect(theirs.status.deals.map((d) => d.id)).toEqual([dealId]);
    // The agents paused: the offering member's agent asked its owner, and that card is theirs alone.
    expect(theirs.status.waiting.questions).toHaveLength(1);
    expect(status.status.waiting.questions).toHaveLength(0);
    const questionId = theirs.status.waiting.questions[0]!.id;
    expect((await memberStatusView(appId, bo.memberId, creator.cookie)).kind).toBe("denied");
    // The deal API shows each member only their own deals, whatever persona they name.
    const list = await j(await dealsList(get(`/api/deals?app=${appId}&as=b`, { cookie: bo.cookie }), ctx()));
    expect(list.deals.map((d: { id: string }) => d.id)).toEqual([dealId]);

    // 7. Bo's own Muse: a member key (made with Bo's session) reads status, actions and cards over HTTP and MCP.
    const made = await makeKey(post(`/api/apps/${appId}/muse-key`, {}, { cookie: bo.cookie }), ctx({ app: appId }));
    expect(made.status).toBe(200);
    const { key } = await j(made);
    const auth = { authorization: `Bearer ${key}` };
    const read = (mod: { GET: (r: Request, c: any) => Promise<Response> }, q = "") => mod.GET(get(`/api/muse/${appId}/x${q}`, auth), ctx({ app: appId }));
    expect((await j(await read(overviewRoute))).app).toMatchObject({ id: appId });
    const museStatus = await j(await read(statusRoute));
    expect(museStatus.member).toMatchObject({ id: bo.memberId, name: "Bo" });
    expect(museStatus.items).toHaveLength(1);
    expect(museStatus.deals.map((d: { id: string }) => d.id)).toEqual([dealId]);
    expect((await j(await read(actionsRoute))).actions.length).toBeGreaterThan(0);
    const cards = await j(await read(cardsRoute));
    expect(cards.count).toBe(cards.pending.questions.length + cards.pending.confirmations.length + cards.pending.offers.length);
    const rpc = await mcpRoute.POST(
      post(`/api/muse/${appId}/mcp`, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_my_status", arguments: {} } }, { ...auth, "content-type": "application/json", accept: "application/json, text/event-stream" }),
      ctx({ app: appId }),
    );
    expect(JSON.parse((await j(rpc)).result.content[0].text).deals).toHaveLength(1);

    // 8. Nothing the Muse holds can answer a card or decide a deal: its key is refused on every write route.
    const writes = [
      answerQuestion(post(`/api/owner-questions/${questionId}/answer?app=${appId}`, { as: "a", answer: "yes" }, auth), ctx({ questionId })),
      answerQuestion(post(`/api/owner-questions/${questionId}/answer?app=${appId}`, { as: "a", answer: "yes" }, { cookie: `agora_s_${appId}=${key}` }), ctx({ questionId })),
      decide(post(`/api/deals/${dealId}/confirm?app=${appId}`, { as: "a", cardId: "c1", decision: "confirm" }, auth), ctx({ dealId })),
      addItem(post(`/api/items?app=${appId}`, { as: "a", kind: "offer", category: cat }, auth), ctx()),
    ];
    for (const r of await Promise.all(writes)) expect(r.status).toBe(401);
    // The card is still waiting for its owner's own tap, and Bo's session cannot answer it either (it is not Bo's card).
    const notBo = await answerQuestion(post(`/api/owner-questions/${questionId}/answer?app=${appId}`, { as: "a", answer: "yes" }, { cookie: bo.cookie }), ctx({ questionId }));
    expect(notBo.status).toBe(403);
    const still = await memberStatusView(appId, creator.memberId, creator.cookie);
    if (still.kind !== "ok") throw new Error("denied");
    expect(still.status.waiting.questions.map((q) => q.id)).toEqual([questionId]);
    // Another member cannot be impersonated by naming a persona: Bo's session acts as Bo only.
    const swapped = await j(await dealsList(get(`/api/deals?app=${appId}&as=a`, { cookie: bo.cookie }), ctx()));
    expect(swapped.deals.map((d: { id: string }) => d.id)).toEqual([dealId]);
  });
});
