import { beforeEach, describe, expect, it } from "vitest";
import { platformFor, resetRateLimit } from "@/app/_composition/api";
import { useAppStore } from "@/app/_composition/apps";
import { createAppStore, createMemoryBackend, loadApp, repoAppIds } from "@/lib/app-config";
import { POST as createApp } from "./apps/route";
import { GET as getApp } from "./apps/[app]/route";
import { POST as addItem } from "./items/route";
import { GET as listDeals } from "./deals/route";

const req = (path: string, body?: unknown) => new Request(`http://localhost${path}`, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;
const config = async (id: string) => ({ ...(await loadApp("garden-tools")), id, name: `Club ${id}`, tagline: "Swap with friends" });

describe("apps as data over HTTP (BR-41)", () => {
  beforeEach(() => {
    resetRateLimit();
    useAppStore(createAppStore(createMemoryBackend(), { reserved: repoAppIds() }));
  });

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

  it("keeps each app's data apart: the demo app and a stored app never see each other's items or deals", async () => {
    await createApp(req("/api/apps", await config("scoped-club")), ctx());
    const demo = await platformFor();
    const other = await platformFor("scoped-club");
    expect(other).not.toBe(demo);
    expect(other.app.id).toBe("scoped-club");
    expect(demo.app.id).not.toBe("scoped-club");

    // The demo app has its seeded deal, the new app starts empty.
    expect((await j(await listDeals(req("/api/deals?as=a&app=scoped-club"), ctx()))).deals).toHaveLength(0);
    expect((await j(await listDeals(req("/api/deals?as=a"), ctx()))).deals.length).toBeGreaterThan(0);

    // An item added to the stored app is in its catalog and not in the demo app's.
    const added = await addItem(req("/api/items?app=scoped-club", { as: "a", kind: "offer", category: "hand-tools", condition: "good", description: "A good spade" }), ctx());
    expect(added.status).toBe(200);
    const { id } = await j(added);
    expect(await other.catalog.items.get(id)).toBeTruthy();
    expect(await demo.catalog.items.get(id)).toBeFalsy();
  });

  it("answers 404 for a request about an app that does not exist", async () => {
    const r = await listDeals(req("/api/deals?as=a&app=ghost-app"), ctx());
    expect(r.status).toBe(404);
    expect((await j(r)).error.code).toBe("unknown_app");
  });
});
