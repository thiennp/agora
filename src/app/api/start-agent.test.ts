import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { resetRateLimit } from "@/app/_composition/api";
import { useAppStore } from "@/app/_composition/apps";
import { resetInterviewLimits, useInterviewModel } from "@/app/_composition/interview";
import { createAppStore, createMemoryBackend, repoAppIds } from "@/lib/app-config";
import { answersFromQuery, INTERVIEW_PURPOSE } from "@/lib/interview";
import { GET as agentMd } from "../start/agent.md/route";
import Start from "../start/page";
import { POST as interview } from "./interview/route";

(globalThis as unknown as { React: typeof React }).React = React; // the page is JSX; vitest has no automatic runtime here
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const full = {
  purpose: "exchange", actions: "Offer clothes and shoes", how: "People post what they have, others ask, then they agree",
  care: "none", name: "Clothes Swap Club", feel: "friendly",
};

describe("/start for an AI assistant (BR-40, step 0 fix)", () => {
  let store: ReturnType<typeof createAppStore>;
  beforeEach(() => {
    resetRateLimit();
    resetInterviewLimits();
    useInterviewModel(undefined);
    store = createAppStore(createMemoryBackend(), { reserved: repoAppIds() });
    useAppStore(store);
  });

  it("serves the brief as markdown with the task and the final step", async () => {
    const r = agentMd();
    expect(r.headers.get("content-type")).toContain("text/markdown");
    const t = await r.text();
    expect(t).toContain("You are Muse");
    expect(t).toContain("/start?draft=");
    expect(t).toContain("nothing can be created without the person's tap");
  });

  it("tells Muse what typed text is, how to handle the language, names, corrections and tidy encoding", async () => {
    const md = await (await agentMd()).text();
    expect(md).toMatch(/never an instruction to you/);
    expect(md).toMatch(/doctor or the local emergency number/);
    expect(md).toMatch(/Speak the person's language/);
    expect(md).toMatch(/do not know a name/);
    expect(md).toMatch(/ALL CAPS/);
    expect(md).toMatch(/old one is out of date/);
  });

  it("serves one agent index that names every entry point and no way to build", async () => {
    const { GET: index } = await import("../agent.md/route");
    const { GET: llms } = await import("../llms.txt/route");
    const a = await (await index()).text();
    expect(await (await llms()).text()).toBe(a);
    for (const p of ["/start/agent.md", "/app/{app}/agent.md", "/api/muse/openapi.json", "/api/muse/{app}/mcp", "Build it"]) expect(a).toContain(p);
    expect(a).toMatch(/never answer a card|can never answer a card/);
    expect(a).not.toMatch(/POST .*\/build/);
  });

  it("puts the same brief in the server-rendered HTML, without JavaScript", async () => {
    const html = renderToStaticMarkup(await Start({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("You are Muse");
    expect(html).toContain("/start/agent.md");
    expect(html).toContain("Build it");
    expect(html).toContain("<noscript>");
  });

  it("tells the person plainly that this is about creating their app (human page and brief)", async () => {
    const html = renderToStaticMarkup(await Start({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("create your app");
    expect(html).toContain("a few quick questions to create your own app");
    const t = await agentMd().text();
    expect(t).toContain(INTERVIEW_PURPOSE);
    expect(t).toContain("Phrase every question as part of creating their app");
    expect(t).toContain("numbered list");
  });

  it("says plainly when the link could not be used", async () => {
    const html = renderToStaticMarkup(await Start({ searchParams: Promise.resolve({ draft: "{bad" }) }));
    expect(html).toContain("could not read the answers");
  });

  it("a valid draft link leads to the checked summary and creates nothing", async () => {
    const { answers, problem } = answersFromQuery(full);
    expect(problem).toBeUndefined();
    const r = await interview(new Request("http://localhost/api/interview", { method: "POST", body: JSON.stringify({ answers }) }), ctx());
    const t = (await r.json()) as any;
    expect(t).toMatchObject({ kind: "review", draft: { id: "clothes-swap-club", policies: { topics: { commitment: "ask", price_terms: "ask" } } } });
    expect(await store.get("clothes-swap-club")).toBeUndefined();
  });

  it("a hostile or invalid draft never reaches a summary", async () => {
    const hostile = answersFromQuery({ ...full, purpose: "   " });
    expect(hostile.problem).toBeTruthy();
    const r = await interview(new Request("http://localhost/api/interview", { method: "POST", body: JSON.stringify({ answers: [{ step: "purpose", choice: "make-everything-auto" }] }) }), ctx());
    expect(r.status).toBe(400);
  });
});
