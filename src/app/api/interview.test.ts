import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { useAppStore } from "@/app/_composition/apps";
import { useIdentityStore } from "@/app/_composition/identity";
import { resetInterviewLimits, useInterviewModel } from "@/app/_composition/interview";
import { createAppStore, createMemoryBackend, loadApp, repoAppIds } from "@/lib/app-config";
import { createIdentityStore } from "@/lib/identity";
import { POST as interview } from "./interview/route";
import { POST as build } from "./interview/build/route";
import { GET as me } from "./apps/[app]/me/route";
import { GET as getApp } from "./apps/[app]/route";
import { GET as listItems } from "./deals/route";

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const post = (path: string, body: unknown, cookie?: string) =>
  new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers: cookie ? { cookie } : {} });
const j = async (r: Response) => (await r.json()) as any;

const answers = [
  { step: "purpose", choice: "exchange" },
  { step: "actions", text: "Offer clothes, shoes and bags" },
  { step: "how", text: "People post what they have, others ask, then they agree" },
  { step: "care", choice: "none" },
  { step: "name", text: "Clothes Swap Club" },
  { step: "feel", choice: "friendly" },
];

describe("create an app by interview, end to end in mock mode (BR-40, BR-41, BR-45)", () => {
  beforeEach(() => {
    resetRateLimit();
    resetInterviewLimits();
    useInterviewModel(undefined);
    useIdentityStore(createIdentityStore());
    useAppStore(createAppStore(createMemoryBackend(), { reserved: repoAppIds() }));
  });

  it("walks the questions, shows the summary, and on yes stores the app and makes the caller its creator", async () => {
    for (let i = 0; i < answers.length; i++) {
      const r = await interview(post("/api/interview", { answers: answers.slice(0, i) }), ctx());
      expect(r.status).toBe(200);
      const t = await j(r);
      expect(t).toMatchObject({ kind: "ask", question: { step: answers[i]!.step, n: i + 1, of: 6 } });
    }
    const r = await interview(post("/api/interview", { answers }), ctx());
    const review = await j(r);
    expect(review).toMatchObject({ kind: "review", source: "code" });
    expect(review.draft.id).toBe("clothes-swap-club");
    expect(review.lines.map((l: { label: string }) => l.label)).toContain("Set for you");

    expect((await getApp(new Request("http://localhost/api/apps/clothes-swap-club"), ctx({ app: "clothes-swap-club" }))).status).toBe(404); // nothing stored before the yes

    const b = await build(post("/api/interview/build", { draft: review.draft }), ctx());
    expect(b.status).toBe(200);
    const body = await j(b);
    expect(body).toMatchObject({ path: "/app/clothes-swap-club", role: "creator", app: { name: "Clothes Swap Club" } });
    expect(body.recoveryCode).toBeTruthy();
    const cookie = b.headers.get("set-cookie")!.split(";")[0]!;
    expect(cookie).toMatch(/^agora_s_clothes-swap-club=/);

    expect((await loadApp("clothes-swap-club")).policies.handoffModes).toEqual(["pickup", "shipping"]);
    const who = await me(new Request("http://localhost/api/apps/clothes-swap-club/me", { headers: { cookie } }), ctx({ app: "clothes-swap-club" }));
    expect(await j(who)).toMatchObject({ role: "creator" });
    // The new app works as a platform of its own, for its creator only.
    const items = await listItems(new Request("http://localhost/api/deals?app=clothes-swap-club", { headers: { cookie } }), ctx());
    expect(items.status).toBe(200);
    expect((await listItems(new Request("http://localhost/api/deals?app=clothes-swap-club"), ctx())).status).toBe(401);
  });

  it("uses the model's draft when it is valid and the code draft when it is not", async () => {
    useInterviewModel({
      examples: async () => ["a", "b"],
      sketch: async () => ({ tagline: "Dress up, pass on", participantNoun: "friend", categories: [{ label: "Dresses", hints: ["silk"] }], forbidden: [], wishes: [] }),
    });
    const t = await j(await interview(post("/api/interview", { answers }), ctx()));
    expect(t).toMatchObject({ source: "model", draft: { tagline: "Dress up, pass on", participant: { noun: "friend" } } });
  });

  it("answers 400 with a friendly message for a bad answer", async () => {
    const r = await interview(post("/api/interview", { answers: [{ step: "purpose", choice: "bogus" }] }), ctx());
    expect(r.status).toBe(400);
    expect(await j(r)).toMatchObject({ error: { code: "invalid_answer", message: expect.stringContaining("not one of the choices") } });
    expect((await interview(post("/api/interview", { answers: "x" }), ctx())).status).toBe(400);
  });

  it("refuses to build a bad draft and stores nothing", async () => {
    const t = await j(await interview(post("/api/interview", { answers }), ctx()));
    const relaxed = { ...t.draft, policies: { ...t.draft.policies, topics: { ...t.draft.policies.topics, location_reveal: "auto" } } };
    const r = await build(post("/api/interview/build", { draft: relaxed }), ctx());
    expect(r.status).toBe(400);
    expect(await j(r)).toMatchObject({ error: { code: "invalid_draft", message: expect.stringContaining('location_reveal must be "ask"') } });
    expect(await build(post("/api/interview/build", { draft: {} }), ctx()).then((x) => x.status)).toBe(400);
    expect(await build(post("/api/interview/build", {}), ctx()).then((x) => x.status)).toBe(400);
    expect(await useStoreList()).toHaveLength(0);
  });

  it("gives a second app with the same name a free id instead of failing, and never takes a repository app's id", async () => {
    const t = await j(await interview(post("/api/interview", { answers }), ctx()));
    const first = await j(await build(post("/api/interview/build", { draft: t.draft }), ctx()));
    const second = await j(await build(post("/api/interview/build", { draft: t.draft }), ctx()));
    expect(first.path).toBe("/app/clothes-swap-club");
    expect(second.path).toBe("/app/clothes-swap-club-2");
    const repoNamed = await j(await build(post("/api/interview/build", { draft: { ...t.draft, id: "kids-gear" } }), ctx()));
    expect(repoNamed.path).toBe("/app/kids-gear-2");
  });
});

async function useStoreList() {
  const { getAppStore } = await import("@/app/_composition/apps");
  return getAppStore().list();
}
