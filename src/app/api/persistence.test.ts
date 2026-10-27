import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { getPlatform } from "@/app/_composition/platform";
import { POST as reset } from "./demo/reset/route";
import { GET as listDeals } from "./deals/route";
import { GET as getDeal } from "./deals/[dealId]/route";
import { POST as confirm } from "./deals/[dealId]/confirm/route";
import { POST as relay } from "./deals/[dealId]/relay/route";
import { POST as answer } from "./owner-questions/[questionId]/answer/route";

const post = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const get = (path: string) => new Request(`http://localhost${path}`);
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;
const g = globalThis as unknown as { __agoraPlatform?: Promise<unknown> };

const views = async (id: string) => ({
  a: await j(await getDeal(get(`/api/deals/${id}?as=a`), ctx({ dealId: id }))),
  b: await j(await getDeal(get(`/api/deals/${id}?as=b`), ctx({ dealId: id }))),
  la: await j(await listDeals(get("/api/deals?as=a"), ctx({}))),
  lb: await j(await listDeals(get("/api/deals?as=b"), ctx({}))),
});

describe("saved state survives a restart", () => {
  let dir: string;
  let file: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "agora-state-"));
    file = join(dir, "state.json");
    process.env.AGORA_STATE_FILE = file;
  });
  afterAll(async () => {
    delete process.env.AGORA_STATE_FILE;
    g.__agoraPlatform = undefined;
    await rm(dir, { recursive: true, force: true });
  });

  it("restores every deal, card and message, then carries on to a confirmed deal", async () => {
    resetRateLimit();
    const { dealId } = await j(await reset(post({}), ctx({})));
    let p = await getPlatform();
    expect(p.persistence).toBe("file");
    expect(p.restored).toBe(false);

    const q = p.cards.questionsFor("demo-mia")[0]!;
    expect((await answer(post({ as: "a", answer: "yes" }), ctx({ questionId: q.id }))).status).toBe(200);
    await relay(post({ as: "a", text: "Hello, is the jacket still free?" }), ctx({ dealId }));
    const before = await views(dealId);
    expect(before.a.conversation?.length ?? before.a.messages?.length ?? 0).toBeGreaterThan(0);

    // The file holds one document with every tracked store.
    const doc = JSON.parse(await readFile(file, "utf8"));
    expect(Object.keys(doc)).toEqual(expect.arrayContaining(["negotiation.deals", "cards.questions", "relay.rows", "platform.meta"]));

    // Restart: the process forgets the platform; the next request builds it again from the file.
    g.__agoraPlatform = undefined;
    p = await getPlatform();
    expect(p.restored).toBe(true);
    expect(p.dealId).toBe(dealId);
    expect(await views(dealId)).toEqual(before);

    // The restored platform keeps working: finish the journey.
    for (let i = 0; i < 4; i++) {
      for (const who of ["demo-mia", "demo-jonas"] as const) for (const qq of p.cards.questionsFor(who)) await answer(post({ as: who === "demo-mia" ? "a" : "b", answer: "yes" }), ctx({ questionId: qq.id }));
    }
    const m = p.cards.confirmationsFor("demo-mia")[0]!;
    const jn = p.cards.confirmationsFor("demo-jonas")[0]!;
    await confirm(post({ as: "a", cardId: m.id, decision: "confirm" }), ctx({ dealId }));
    const done = await confirm(post({ as: "b", cardId: jn.id, decision: "confirm" }), ctx({ dealId }));
    expect((await j(done)).state).toBe("confirmed");

    // Starting again deletes the saved state.
    await reset(post({}), ctx({}));
    expect((await getPlatform()).restored).toBe(false);
  });
});
