import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getPlatform, resetPlatform } from "@/app/_composition/platform";
import { GET as listDeals } from "./deals/route";
import { GET as getDeal } from "./deals/[dealId]/route";
import { POST as confirm } from "./deals/[dealId]/confirm/route";
import { POST as relay } from "./deals/[dealId]/relay/route";
import { POST as answer } from "./owner-questions/[questionId]/answer/route";
import { createTestApp, ctx, endWorld, j, resetWorld, startJacketDeal, type TestApp } from "./test-support";

const g = globalThis as unknown as { __agoraPlatforms?: Map<string, unknown> };

let t: TestApp;
const views = async (id: string) => ({
  a: await j(await getDeal(t.get(t.a, `/api/deals/${id}`), ctx({ dealId: id }))),
  b: await j(await getDeal(t.get(t.b, `/api/deals/${id}`), ctx({ dealId: id }))),
  la: await j(await listDeals(t.get(t.a, "/api/deals"), ctx())),
  lb: await j(await listDeals(t.get(t.b, "/api/deals"), ctx())),
});

// What the sender typed stays in memory; after a restart their own view shows the screened text instead, so compare without it.
const noOriginal = (v: unknown): unknown => JSON.parse(JSON.stringify(v, (k, x) => (k === "original" ? undefined : x)));

describe("saved state survives a restart", () => {
  afterEach(endWorld);
  let dir: string;
  let file: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "agora-state-"));
    file = join(dir, "state.json");
    process.env.AGORA_STATE_FILE = file;
  });
  afterAll(async () => {
    delete process.env.AGORA_STATE_FILE;
    g.__agoraPlatforms?.clear();
    await rm(dir, { recursive: true, force: true });
  });

  it("restores every deal, card and message, then carries on to a confirmed deal", async () => {
    resetWorld();
    t = await createTestApp();
    const { dealId } = await startJacketDeal(t);
    let p = t.platform;
    expect(p.persistence).toBe("file");
    expect(p.restored).toBe(false);

    const q = p.cards.questionsFor(t.a.id)[0]!;
    expect((await answer(t.post(t.a, "/x", { answer: "yes" }), ctx({ questionId: q.id }))).status).toBe(200);
    await relay(t.post(t.a, "/x", { text: "Hello, is the jacket still free?" }), ctx({ dealId }));
    // a message with a phone number: the saved copy keeps the screened text, never what was typed
    await relay(t.post(t.a, "/x", { text: "Call me on 0151 7654321 please" }), ctx({ dealId }));
    const before = await views(dealId);
    expect(before.a.conversation?.length ?? before.a.messages?.length ?? 0).toBeGreaterThan(0);

    // The file holds one document with every tracked store.
    const saved = `${file}.${t.appId}`; // every app has its own saved document
    const doc = JSON.parse(await readFile(saved, "utf8"));
    expect(await readFile(saved, "utf8")).not.toContain("7654321");
    expect(Object.keys(doc)).toEqual(expect.arrayContaining(["negotiation.deals", "cards.questions", "relay.rows", "platform.meta"]));

    // Restart: the process forgets the platform; the next request builds it again from the file.
    g.__agoraPlatforms?.clear();
    p = await getPlatform(t.appId);
    expect(p.restored).toBe(true);
    expect(p.byId.has(t.a.id) && p.byId.has(t.b.id)).toBe(true); // the members come back from the identity store
    const after = await views(dealId);
    expect(noOriginal(after)).toEqual(noOriginal(before));
    expect(JSON.stringify(after)).not.toContain("7654321");

    // The restored platform keeps working: finish the journey.
    for (let i = 0; i < 4; i++) {
      for (const m of [t.a, t.b]) for (const qq of p.cards.questionsFor(m.id)) await answer(t.post(m, "/x", { answer: "yes" }), ctx({ questionId: qq.id }));
    }
    const m = p.cards.confirmationsFor(t.a.id)[0]!;
    const jn = p.cards.confirmationsFor(t.b.id)[0]!;
    await confirm(t.post(t.a, "/x", { cardId: m.id, decision: "confirm" }), ctx({ dealId }));
    const done = await confirm(t.post(t.b, "/x", { cardId: jn.id, decision: "confirm" }), ctx({ dealId }));
    expect((await j(done)).state).toBe("confirmed");

    // Starting again deletes the saved state.
    await resetPlatform(t.appId);
    expect((await getPlatform(t.appId)).restored).toBe(false);
  });
});
