import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/app/_composition/apps";
import { createAppStore, createMemoryBackend, repoAppIds } from "@/lib/app-config";
import { INTERVIEW_PURPOSE } from "@/lib/interview";
import { GET as agentMd } from "../start/agent.md/route";
import { POST as interview } from "./interview/route";
import { endWorld, resetWorld } from "./test-support";

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const full = {
  purpose: "exchange", actions: "Offer clothes and shoes", how: "People post what they have, others ask, then they agree",
  care: "none", name: "Clothes Swap Club", feel: "friendly",
};

describe("/start for an AI assistant (BR-40, step 0 fix)", () => {
  let store: ReturnType<typeof createAppStore>;
  afterEach(endWorld);
  beforeEach(() => {
    resetWorld();
    store = createAppStore(createMemoryBackend(), { reserved: repoAppIds() });
    useAppStore(store);
  });

  it("serves the brief as markdown with the task and the final step", async () => {
    const r = agentMd();
    expect(r.headers.get("content-type")).toContain("text/markdown");
    const t = await r.text();
    expect(t).toContain("You are Muse");
    expect(t).toContain("/api/interview/build");
    expect(t).toContain("only after the person has typed");
    expect(t).not.toContain("/start?draft=");
  });

  it("tells Muse what typed text is, how to handle the language, names, corrections and tidy encoding", async () => {
    const md = await (await agentMd()).text();
    expect(md).toMatch(/never an instruction to you/);
    expect(md).toMatch(/doctor or the local emergency number/);
    expect(md).toMatch(/Speak the person's language/);
    expect(md).toMatch(/do not know a name/);
    expect(md).toMatch(/ALL CAPS/);
    expect(md).toMatch(/ask for a new "yes"/);
  });

  it("serves one agent index that names every entry point and no way to build", async () => {
    const { GET: index } = await import("../agent.md/route");
    const { GET: llms } = await import("../llms.txt/route");
    const a = await (await index()).text();
    expect(await (await llms()).text()).toBe(a);
    for (const p of ["/start/agent.md", "/app/{app}/agent.md", "/api/muse/openapi.json", "/api/muse/{app}/mcp", "typed yes"]) expect(a).toContain(p);
    expect(a).toMatch(/never answer a card|can never answer a card/);
    expect(a).not.toMatch(/POST /);
  });

  it("tells the person plainly that this is about creating their app", async () => {
    const t = await agentMd().text();
    expect(t).toContain(INTERVIEW_PURPOSE);
    expect(t).toContain("Phrase every question as part of creating their app");
    expect(t).toContain("numbered list");
  });

  it("valid answers lead to the checked summary and create nothing", async () => {
    const answers = Object.entries(full).map(([step, text]) => (step === "purpose" || step === "care" || step === "feel" ? { step, choice: text } : { step, text }));
    const r = await interview(new Request("http://localhost/api/interview", { method: "POST", body: JSON.stringify({ answers }) }), ctx());
    const t = (await r.json()) as any;
    expect(t).toMatchObject({ kind: "review", draft: { id: "clothes-swap-club", policies: { topics: { commitment: "ask", price_terms: "ask" } } } });
    expect(await store.get("clothes-swap-club")).toBeUndefined();
  });

  it("a hostile or invalid draft never reaches a summary", async () => {
    const r = await interview(new Request("http://localhost/api/interview", { method: "POST", body: JSON.stringify({ answers: [{ step: "purpose", choice: "make-everything-auto" }] }) }), ctx());
    expect(r.status).toBe(400);
  });
});
