import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformFor } from "@/app/_composition/api";
import { loadApp } from "@/lib/app-config";
import { POST as createApp } from "./apps/route";
import { endWorld, resetWorld } from "./test-support";
import { GET as getApp } from "./apps/[app]/route";
import { POST as addItem } from "./items/route";
import { GET as listDeals } from "./deals/route";

const req = (path: string, body?: unknown) => new Request(`http://localhost${path}`, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
const withCookie = (r: Request, cookie: string) => new Request(r, { headers: { cookie } });
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;
const config = async (id: string) => ({ ...(await loadApp("garden-tools")), id, name: `Club ${id}`, tagline: "Swap with friends" });

describe("apps as data over HTTP (BR-41)", () => {
  afterEach(endWorld);
  beforeEach(() => resetWorld());

  it("creates an app from a config, then serves its public summary without a redeploy", async () => {
    const created = await createApp(req("/api/apps", await config("friends-club")), ctx());
    expect(created.status).toBe(200);
    expect(await j(created)).toMatchObject({ app: { id: "friends-club", name: "Club friends-club" }, path: "/app/friends-club" });
    const got = await getApp(req("/api/apps/friends-club"), ctx({ app: "friends-club" }));
    expect(await j(got)).toMatchObject({ app: { id: "friends-club", tagline: "Swap with friends", region: "Austin, TX" } });
    expect(JSON.stringify(await j(await getApp(req("/api/apps/kids-gear"), ctx({ app: "kids-gear" }))))).toContain("kids-gear");
  });

  it("answers an invalid config with 400, a taken id with 409 and an unknown app with 404", async () => {
    const cfg = await config("rules-club");
    const bad = await createApp(req("/api/apps", { ...cfg, policies: { ...cfg.policies, topics: { ...cfg.policies.topics, price_terms: "auto" } } }), ctx());
    expect(bad.status).toBe(400);
    expect((await j(bad)).error.code).toBe("invalid_app");
    expect((await createApp(req("/api/apps", cfg), ctx())).status).toBe(200);
    const dup = await createApp(req("/api/apps", cfg), ctx());
    expect(dup.status).toBe(409);
    expect((await j(dup)).error.code).toBe("app_exists");
    expect((await createApp(req("/api/apps", await config("kids-gear")), ctx())).status).toBe(400);
    expect((await getApp(req("/api/apps/nothing"), ctx({ app: "nothing" }))).status).toBe(404);
  });

  it("keeps each app's data apart: two stored apps never see each other's items or deals", async () => {
    const created = await createApp(req("/api/apps", await config("scoped-club")), ctx());
    const cookie = created.headers.get("set-cookie")!.split(";")[0]!;
    const other2 = await createApp(req("/api/apps", await config("other-club")), ctx());
    const cookie2 = other2.headers.get("set-cookie")!.split(";")[0]!;
    const first = await platformFor("scoped-club");
    const second = await platformFor("other-club");
    expect(first).not.toBe(second);
    expect(first.app.id).toBe("scoped-club");
    expect(second.app.id).toBe("other-club");

    // Both apps start empty.
    expect((await j(await listDeals(withCookie(req("/api/deals?as=a&app=scoped-club"), cookie), ctx()))).deals).toHaveLength(0);
    expect((await j(await listDeals(withCookie(req("/api/deals?as=a&app=other-club"), cookie2), ctx()))).deals).toHaveLength(0);

    // An item added to one app is in its catalog and not in the other's; one app's session does not open the other.
    const added = await addItem(withCookie(req("/api/items?app=scoped-club", { as: "a", kind: "offer", category: "hand-tools", condition: "good", description: "A good spade" }), cookie), ctx());
    expect(added.status).toBe(200);
    const { id } = await j(added);
    expect(await first.catalog.items.get(id)).toBeTruthy();
    expect(await second.catalog.items.get(id)).toBeFalsy();
    expect((await addItem(withCookie(req("/api/items?app=other-club", { as: "a", kind: "offer", category: "hand-tools", condition: "good" }), cookie), ctx())).status).toBe(401);
  });

  it("answers 404 for a request about an app that does not exist", async () => {
    const r = await listDeals(req("/api/deals?as=a&app=ghost-app"), ctx());
    expect(r.status).toBe(404);
    expect((await j(r)).error.code).toBe("unknown_app");
  });
});
