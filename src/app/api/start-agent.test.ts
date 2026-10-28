import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { resetRateLimit } from "@/app/_composition/api";
import { useAppStore } from "@/app/_composition/apps";
import { resetInterviewLimits, useInterviewModel } from "@/app/_composition/interview";
import { createAppStore, createMemoryBackend, repoAppIds } from "@/lib/app-config";
import { answersFromQuery } from "@/lib/interview";
import { GET as agentMd } from "../start/agent.md/route";
import Start from "../start/page";
import { POST as interview } from "./interview/route";

(globalThis as unknown as { React: typeof React }).React = React; // the page is JSX; vitest has no automatic runtime here
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const full = {
  purpose: "exchange", people: "Friends who like fashion", things: "Clothes and shoes", place: "online", languages: "en",
  handover: "post", pricing: "free", care: "none", name: "Clothes Swap Club", feel: "friendly",
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

  it("puts the same brief in the server-rendered HTML, without JavaScript", async () => {
    const html = renderToStaticMarkup(await Start({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("You are Muse");
    expect(html).toContain("/start/agent.md");
    expect(html).toContain("Build it");
    expect(html).toContain("<noscript>");
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
    const hostile = answersFromQuery({ ...full, languages: "!!!" });
    expect(hostile.problem).toBeTruthy();
    const r = await interview(new Request("http://localhost/api/interview", { method: "POST", body: JSON.stringify({ answers: [{ step: "purpose", choice: "make-everything-auto" }] }) }), ctx());
    expect(r.status).toBe(400);
  });
});
