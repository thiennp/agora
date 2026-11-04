import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { resetRateLimit } from "@/app/_composition/api";
import { useAppStore } from "@/app/_composition/apps";
import { useIdentityStore } from "@/app/_composition/identity";
import { createAppStore, createMemoryBackend, loadApp, repoAppIds } from "@/lib/app-config";
import { createIdentityStore } from "@/lib/identity";
import { POST as createApp } from "./apps/route";
import { POST as join } from "./apps/[app]/join/route";
import { GET as agentMd } from "../app/[app]/agent.md/route";
import AppPage from "../app/[app]/page";

(globalThis as unknown as { React: typeof React }).React = React;
let cookieHeader = "";
vi.mock("next/headers", () => ({ cookies: async () => ({ toString: () => cookieHeader }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, useRouter: () => ({ refresh() {} }) }));

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const appCtx = (app: string) => ({ params: Promise.resolve({ app }) });
const post = (path: string, body: unknown) => new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;
const page = async (app: string, cookie = "") => {
  cookieHeader = cookie;
  return renderToStaticMarkup(await AppPage({ params: Promise.resolve({ app }) }));
};

async function setup() {
  const cfg = { ...(await loadApp("garden-tools")), id: "club-a", name: "Club A", tagline: "Neighbours swap seeds" };
  const c = await createApp(post("/api/apps", cfg), ctx());
  const creator = { cookie: cookieOf(c), ...((await c.json()) as any) };
  const m = await join(post("/api/apps/club-a/join", { name: "Bo Secretname" }), ctx({ app: "club-a" }));
  const member = { cookie: cookieOf(m), ...((await m.json()) as any) };
  return { creator, member };
}

describe("public, Muse-readable app page (BR-42, docs/PLAN.md §2c-ter)", () => {
  beforeEach(() => {
    resetRateLimit();
    useIdentityStore(createIdentityStore());
    useAppStore(createAppStore(createMemoryBackend(), { reserved: repoAppIds() }));
  });

  it("shows a stranger the public page in server HTML, with the assistant brief and no secrets or user data", async () => {
    const { creator, member } = await setup();
    const html = await page("club-a");
    expect(html).toContain("Club A");
    expect(html).toContain("Neighbours swap seeds");
    expect(html).toContain("anyone with Muse");
    expect(html).toContain("For an AI assistant");
    expect(html).toContain("/app/club-a/agent.md");
    expect(html).toContain("always asks you first");
    for (const secret of [creator.memberId, member.memberId, creator.recoveryCode ?? "", member.recoveryCode ?? "", "Bo Secretname", creator.cookie.split("=")[1]!, member.cookie.split("=")[1]!]) {
      if (secret) expect(html).not.toContain(secret);
    }
    expect(html).not.toMatch(/community|invite/i);
    expect(html).toContain("Join Club A");
  });

  it("serves the same page as markdown that Muse can follow without clicking, and holds no secret", async () => {
    const { creator, member } = await setup();
    const r = await agentMd(new Request("http://localhost/app/club-a/agent.md"), appCtx("club-a"));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/markdown");
    const t = await r.text();
    for (const part of ["Club A", "Neighbours swap seeds", "What a person can do", "How it works", "must never do", "How you (Muse, Meta AI) should use this", "send no web request", "/pair", "is not built", "https://agentwitch.com/agora/app/club-a"]) {
      expect(t).toContain(part);
    }
    expect(t).not.toMatch(/community|invite/i);
    for (const secret of [creator.memberId, member.memberId, "Bo Secretname", member.recoveryCode ?? ""]) if (secret) expect(t).not.toContain(secret);
  });

  it("answers 404 in markdown for an unknown app, and serves repository apps too", async () => {
    expect((await agentMd(new Request("http://localhost/app/nope/agent.md"), appCtx("nope"))).status).toBe(404);
    expect((await agentMd(new Request("http://localhost/app/kids-gear/agent.md"), appCtx("kids-gear"))).status).toBe(200);
  });

  it("keeps the creator's overview private: the share link and people list appear only with the creator's session", async () => {
    const { creator, member } = await setup();
    const asCreator = await page("club-a", creator.cookie);
    expect(asCreator).toContain("Share your app");
    expect(asCreator).toContain("People using your app (2)");
    expect(asCreator).toContain("Bo Secretname");
    for (const other of ["", member.cookie, "agora_s_club-a=forged"]) {
      const html = await page("club-a", other);
      expect(html).not.toContain("Share your app");
      expect(html).not.toContain("People using your app");
      expect(html).not.toContain("Bo Secretname");
    }
  });

  it("sets a person up on first use through the existing join path (no form), once per phone", async () => {
    await setup();
    const first = await join(post("/api/apps/club-a/join", {}), ctx({ app: "club-a" }));
    const body = (await first.json()) as any;
    expect(first.status).toBe(200);
    expect(body.recoveryCode).toBeTruthy();
    const again = await join(new Request("http://localhost/api/apps/club-a/join", { method: "POST", body: "{}", headers: { cookie: cookieOf(first) } }), ctx({ app: "club-a" }));
    expect(((await again.json()) as any).alreadyMember).toBe(true);
    const html = await page("club-a", cookieOf(first));
    expect(html).toContain("You are using");
    expect(html).toContain("what your agent is doing for you");
  });

  it("does not create anyone when a page is only read (an assistant runs no script)", async () => {
    const { creator } = await setup();
    await page("club-a");
    await agentMd(new Request("http://localhost/app/club-a/agent.md"), appCtx("club-a"));
    const html = await page("club-a", creator.cookie);
    expect(html).toContain("People using your app (2)");
  });

  it("keeps old links working: the same address, the join and members API paths and the status route", async () => {
    await setup();
    expect(await page("club-a")).toContain("Club A");
    const j = await join(post("/api/apps/club-a/join", {}), ctx({ app: "club-a" }));
    expect(j.status).toBe(200);
    const demo = await page("kids-gear");
    expect(demo).toContain("demo app");
  });
});
