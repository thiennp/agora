import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { appPageView } from "@/app/_composition/app-views";
import { useAppStore } from "@/app/_composition/apps";
import { useIdentityStore } from "@/app/_composition/identity";
import { appUrl } from "@/app/_composition/public-url";
import { createAppStore, createMemoryBackend, loadApp, repoAppIds } from "@/lib/app-config";
import { createIdentityStore } from "@/lib/identity";
import { POST as createApp } from "./apps/route";
import { POST as join } from "./apps/[app]/join/route";

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const post = (path: string, body: unknown, cookie?: string) =>
  new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers: cookie ? { cookie } : {} });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;

async function setup() {
  const cfg = { ...(await loadApp("garden-tools")), id: "club-a", name: "Club A", tagline: "Neighbours swap seeds" };
  const c = await createApp(post("/api/apps", cfg), ctx());
  const creator = { cookie: cookieOf(c), ...((await c.json()) as any) };
  const m = await join(post("/api/apps/club-a/join", { name: "Bo" }), ctx({ app: "club-a" }));
  const member = { cookie: cookieOf(m), ...((await m.json()) as any) };
  return { creator, member };
}

describe("app overview, invite and join page (BR-42, BR-45)", () => {
  beforeEach(() => {
    resetRateLimit();
    useIdentityStore(createIdentityStore());
    useAppStore(createAppStore(createMemoryBackend(), { reserved: repoAppIds() }));
  });

  it("gives a stranger the join page: name, purpose, features and rules, and nothing about members", async () => {
    const { creator, member } = await setup();
    const v = await appPageView("club-a", null);
    expect(v.kind).toBe("stranger");
    if (v.kind !== "stranger") return;
    expect(v.app.name).toBe("Club A");
    expect(v.description.purpose).toBe("Neighbours swap seeds");
    expect(v.description.rules.join(" ")).toMatch(/always asks you first/);
    const text = JSON.stringify(v);
    for (const secret of [creator.memberId, member.memberId, creator.recoveryCode ?? "", "Bo", creator.cookie.split("=")[1]!, member.cookie.split("=")[1]!]) {
      if (secret) expect(text).not.toContain(secret);
    }
    // Forged, other-app and garbage cookies are strangers too.
    expect((await appPageView("club-a", "agora_s_club-a=forged")).kind).toBe("stranger");
    expect((await appPageView("club-a", `agora_s_club-a=${creator.memberId}`)).kind).toBe("stranger");
  });

  it("gives the creator the overview with the member list, and a member only the member view", async () => {
    const { creator, member } = await setup();
    const c = await appPageView("club-a", creator.cookie);
    expect(c.kind).toBe("creator");
    if (c.kind === "creator") {
      expect(c.members.map((m) => [m.role, m.name])).toEqual([["creator", ""], ["member", "Bo"]]);
      expect(JSON.stringify(c)).not.toContain(member.cookie.split("=")[1]!);
    }
    const m = await appPageView("club-a", member.cookie);
    expect(m.kind).toBe("member");
    expect(JSON.stringify(m)).not.toContain("Bo");
    expect("members" in m).toBe(false);
  });

  it("does not let a session of one app open another app's overview", async () => {
    const { creator } = await setup();
    await createApp(post("/api/apps", { ...(await loadApp("garden-tools")), id: "club-b", name: "Club B" }), ctx());
    expect((await appPageView("club-b", creator.cookie.replace("club-a", "club-b"))).kind).toBe("stranger");
    expect((await appPageView("club-b", creator.cookie)).kind).toBe("stranger");
  });

  it("joining from the invite page makes a member who then sees the member view", async () => {
    await setup();
    const j = await join(post("/api/apps/club-a/join", {}), ctx({ app: "club-a" }));
    expect(j.status).toBe(200);
    expect((await appPageView("club-a", cookieOf(j))).kind).toBe("member");
  });

  it("answers unknown apps with unknown, and repository apps with the public demo view", async () => {
    expect((await appPageView("nope", null)).kind).toBe("unknown");
    expect((await appPageView("nope", "agora_s_nope=x")).kind).toBe("unknown");
    expect((await appPageView("kids-gear", null)).kind).toBe("demo");
  });

  it("builds an invite link that is only the app's address, with no secret in it", async () => {
    const { creator, member } = await setup();
    const url = appUrl("club-a");
    expect(url).toBe("https://agentwitch.com/agora/app/club-a");
    expect(new URL(url).search).toBe("");
    for (const secret of [creator.memberId, member.memberId, creator.cookie.split("=")[1]!, member.cookie.split("=")[1]!]) expect(url).not.toContain(secret);
  });
});
