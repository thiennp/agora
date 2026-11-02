import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp, ctx, endWorld, j, resetWorld, startJacketDeal, type TestApp } from "./test-support";
import { getMuseKeyStore, getWebhookStore } from "@/app/_composition/identity";
import { notifyWebhooks, signWebhook, useWebhookDelivery } from "@/app/_composition/webhooks";
import { connectBrief, describeApp, loadApp } from "@/lib/app-config";
import { isPrivateAddress, parseWebhookUrl, WebhookUrlError } from "@/lib/webhook-url";
import { POST as makeCode } from "./apps/[app]/connect-code/route";
import { POST as connect } from "./apps/[app]/connect/route";
import { GET as brief } from "../app/[app]/connect.md/route";
import { GET as updatesRoute } from "./muse/[app]/updates/route";
import * as webhookRoute from "./muse/[app]/webhook/route";

const bearer = (key: string) => ({ authorization: `Bearer ${key}` });
const req = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers });

async function connectAs(t: TestApp, who = t.b) {
  const c = await j(await makeCode(req("POST", `/api/apps/${t.appId}/connect-code`, {}, { cookie: who.cookie }), ctx({ app: t.appId })));
  const r = await connect(req("POST", `/api/apps/${t.appId}/connect`, { code: c.code }), ctx({ app: t.appId }));
  return { code: c.code as string, prompt: c.prompt as string, res: r };
}
const poll = (t: TestApp, key: string, since?: string) =>
  updatesRoute(req("GET", `/api/muse/${t.appId}/updates${since ? `?since=${encodeURIComponent(since)}` : ""}`, undefined, bearer(key)), ctx({ app: t.appId }));

describe("connecting a person's own assistant", () => {
  beforeEach(() => resetWorld());
  afterEach(endWorld);

  it("gives a signed-in person a one-time code and a prompt, and swaps the code for a read-only key and the app's facts, once", async () => {
    const t = await createTestApp();
    expect((await makeCode(req("POST", `/api/apps/${t.appId}/connect-code`, {}), ctx({ app: t.appId }))).status).toBe(401);
    const { code, prompt, res } = await connectAs(t);
    expect(prompt).toContain(code);
    expect(prompt).toContain(`/app/${t.appId}/connect.md`);
    expect(prompt).toMatch(/in your own words/);
    expect(res.status).toBe(200);
    const body = await j(res);
    expect(body).toMatchObject({ connected: true, readOnly: true, keyShownOnce: true });
    expect(body.key).toMatch(/^agmk_/);
    // The assistant is handed the facts, and told to explain them in its own voice.
    expect(body.about.purpose).toBeTruthy();
    expect(body.about.features.length).toBeGreaterThan(0);
    expect(body.next).toMatch(/own words/);
    expect(body.urls.updates).toContain(`/api/muse/${t.appId}/updates`);
    // The code works once.
    expect((await connect(req("POST", `/api/apps/${t.appId}/connect`, { code }), ctx({ app: t.appId }))).status).toBe(401);
    // The key is that member's, and is listed without being shown.
    expect(await getMuseKeyStore().list(t.appId, t.b.id)).toEqual([expect.objectContaining({ label: "My assistant", revoked: false })]);
  });

  it("refuses a wrong code, a code of another app and an ended code", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = await createTestApp();
    const other = await createTestApp();
    const c = await j(await makeCode(req("POST", `/api/apps/${t.appId}/connect-code`, {}, { cookie: t.b.cookie }), ctx({ app: t.appId })));
    expect((await connect(req("POST", `/api/apps/${t.appId}/connect`, { code: "nope" }), ctx({ app: t.appId }))).status).toBe(401);
    expect((await connect(req("POST", `/api/apps/${other.appId}/connect`, { code: c.code }), ctx({ app: other.appId }))).status).toBe(401);
    vi.setSystemTime(Date.now() + 16 * 60_000);
    expect((await connect(req("POST", `/api/apps/${t.appId}/connect`, { code: c.code }), ctx({ app: t.appId }))).status).toBe(401);
  });

  it("serves a public brief that makes the assistant explain the app in its own words right after connecting, and holds no secret", async () => {
    const t = await createTestApp();
    const r = await brief(new Request("http://localhost/"), { params: Promise.resolve({ app: t.appId }) });
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).toMatch(/Right after connecting: tell the person what you know and what you would do/);
    expect(text).toMatch(/in your own words/);
    expect(text).toMatch(/Do not invent features/);
    expect(text).toContain("/updates");
    expect(text).toContain("/webhook");
    expect(text).not.toMatch(/agmk_[A-Za-z0-9_-]{20}/);
    expect(connectBrief({ id: "x", name: "X", region: "Anywhere", participant: "person", languages: ["en"] }, describeApp(await loadApp("garden-tools")), "https://h")).toContain("https://h/api/muse/x/updates");
    expect((await brief(new Request("http://localhost/"), { params: Promise.resolve({ app: "nope-app" }) })).status).toBe(404);
  });
});

describe("polling for updates", () => {
  beforeEach(() => resetWorld());
  afterEach(endWorld);

  it("returns a starting cursor first, then only what is new, for that member only", async () => {
    const t = await createTestApp();
    const key = (await j((await connectAs(t, t.a)).res)).key as string;
    const first = await j(await poll(t, key));
    expect(first).toMatchObject({ events: [], more: false, waiting: { total: 0 } });
    expect(first.notice).toMatch(/Read only/);
    await startJacketDeal(t);
    const next = await j(await poll(t, key, first.cursor));
    expect(next.events.length).toBeGreaterThan(0);
    expect(next.waiting.total).toBeGreaterThan(0); // the offering owner has a question waiting
    expect(JSON.stringify(next)).not.toMatch(/agmk_/);
    // Polling again with the new cursor is quiet; the cursor never moves back.
    const quiet = await j(await poll(t, key, next.cursor));
    expect(quiet.events).toEqual([]);
    expect(quiet.cursor).toBe(next.cursor);
    expect(quiet.waiting.total).toBe(next.waiting.total);
    // A key needs to be valid.
    expect((await poll(t, "agmk_" + "x".repeat(43))).status).toBe(401);
  });
});

describe("webhooks", () => {
  beforeEach(() => resetWorld());
  afterEach(endWorld);

  const put = (t: TestApp, key: string, body: unknown) => webhookRoute.PUT(req("PUT", `/api/muse/${t.appId}/webhook`, body, bearer(key)), ctx({ app: t.appId }));

  it("refuses addresses that are not public https, and an address that resolves to a private one", async () => {
    const t = await createTestApp();
    const key = (await j((await connectAs(t, t.a)).res)).key as string;
    for (const url of ["http://hook.example.org/x", "https://localhost/x", "https://10.0.0.5/x", "https://[::1]/x", "https://hook.internal/x", "https://user:pw@hook.example.org/x", "https://hook.example.org:8443/x", "nonsense"]) {
      expect((await put(t, key, { url })).status, url).toBe(400);
    }
    useWebhookDelivery({ fetch: vi.fn(), lookup: async () => ["169.254.169.254"] });
    expect((await put(t, key, { url: "https://hook.example.org/x" })).status).toBe(400);
    expect(isPrivateAddress("::ffff:10.1.2.3")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(() => parseWebhookUrl("http://a.example.org")).toThrow(WebhookUrlError);
  });

  it("stores the address, shows the secret once, never returns it again, and needs a valid key", async () => {
    const t = await createTestApp();
    useWebhookDelivery({ fetch: vi.fn(), lookup: async () => ["93.184.216.34"] });
    const key = (await j((await connectAs(t, t.a)).res)).key as string;
    expect((await put(t, "agmk_" + "x".repeat(43), { url: "https://hook.example.org/x" })).status).toBe(401);
    const r = await j(await put(t, key, { url: "https://hook.example.org/x" }));
    expect(r).toMatchObject({ registered: true, secretShownOnce: true });
    expect(r.secret.length).toBeGreaterThan(20);
    const got = await j(await webhookRoute.GET(req("GET", `/api/muse/${t.appId}/webhook`, undefined, bearer(key)), ctx({ app: t.appId })));
    expect(got.webhook).toMatchObject({ url: "https://hook.example.org/x", active: true });
    expect(JSON.stringify(got)).not.toContain(r.secret);
    const own = await j(await put(t, key, { url: "https://hook.example.org/y", secret: "my-own-secret-123456" }));
    expect(own.secret).toBeUndefined();
    expect((await webhookRoute.DELETE(req("DELETE", `/api/muse/${t.appId}/webhook`, undefined, bearer(key)), ctx({ app: t.appId }))).status).toBe(200);
    expect((await j(await webhookRoute.GET(req("GET", `/api/muse/${t.appId}/webhook`, undefined, bearer(key)), ctx({ app: t.appId })))).webhook).toBeNull();
  });

  it("sends a signed signal with no text when something new happens, retries after a failure, and stops after the key is revoked", async () => {
    const t = await createTestApp();
    const sent: { url: string; init: RequestInit }[] = [];
    let status = 200;
    useWebhookDelivery({ fetch: (async (url: string, init: RequestInit) => (sent.push({ url: String(url), init }), new Response("", { status }))) as never, lookup: async () => ["93.184.216.34"] });
    const key = (await j((await connectAs(t, t.a)).res)).key as string;
    const { secret } = await j(await put(t, key, { url: "https://hook.example.org/x" }));
    await notifyWebhooks(t.appId);
    expect(sent).toHaveLength(0); // nothing new yet

    await startJacketDeal(t); // the routes announce it themselves, after saving
    await notifyWebhooks(t.appId);
    expect(sent.length).toBeGreaterThan(0);
    const { init } = sent.at(-1)!;
    const body = init.body as string;
    const h = init.headers as Record<string, string>;
    expect(h["x-agora-signature"]).toBe(signWebhook(secret, h["x-agora-timestamp"]!, body));
    expect(init.redirect).toBe("manual");
    expect(JSON.parse(body)).toMatchObject({ type: "agora.update", app: t.appId });
    expect(body).not.toMatch(/jacket|agmk_|cookie/i);
    expect(await getWebhookStore().get(t.appId, t.a.id)).toMatchObject({ failures: 0, lastStatus: 200 });
    const settled = sent.length;
    await notifyWebhooks(t.appId);
    expect(sent).toHaveLength(settled); // accepted: nothing more to say

    // A receiver that fails does not lose the news: the cursor stays, and the next pass tries again.
    status = 500;
    await startJacketDeal(t);
    await notifyWebhooks(t.appId);
    expect((await getWebhookStore().get(t.appId, t.a.id))?.failures).toBeGreaterThan(0);
    status = 200;
    const before = sent.length;
    await notifyWebhooks(t.appId);
    expect(sent.length).toBeGreaterThan(before);
    expect(await getWebhookStore().get(t.appId, t.a.id)).toMatchObject({ failures: 0 });

    // Revoking the key ends the connection.
    const [k] = await getMuseKeyStore().list(t.appId, t.a.id);
    await getMuseKeyStore().revoke(t.appId, t.a.id, k!.keyId);
    const after = sent.length;
    await startJacketDeal(t);
    await notifyWebhooks(t.appId);
    expect(sent).toHaveLength(after);
  });
});
