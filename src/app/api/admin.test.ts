import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminLimiter } from "@/app/_composition/admin";
import { GET as listApps } from "./admin/apps/route";
import { POST as signIn } from "./admin/session/route";
import { createTestApp, endWorld, resetWorld, ctx, j } from "./test-support";

const TOKEN = "operator-token-0123456789";
const get = (headers: Record<string, string> = {}) => new Request("http://localhost/api/admin/apps", { headers });

describe("admin app list", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    endWorld();
  });
  beforeEach(() => {
    adminLimiter.reset();
    return resetWorld();
  });

  it("does not exist without ADMIN_TOKEN", async () => {
    expect((await listApps(get({ authorization: `Bearer ${TOKEN}` }), ctx())).status).toBe(404);
  });

  it("refuses a missing or wrong token and lists apps for the right one", async () => {
    vi.stubEnv("ADMIN_TOKEN", TOKEN);
    expect((await listApps(get(), ctx())).status).toBe(401);
    expect((await listApps(get({ authorization: "Bearer nope" }), ctx())).status).toBe(401);
    const app = await createTestApp();
    const ok = await listApps(get({ authorization: `Bearer ${TOKEN}` }), ctx());
    expect(ok.status).toBe(200);
    const body = await j(ok);
    expect(body.apps).toEqual([expect.objectContaining({ id: app.appId, members: 2, hasCreator: true })]);
    expect(JSON.stringify(body)).not.toMatch(/recovery|session|token/i);
  });

  it("sets an HttpOnly cookie for a right token and redirects with an error for a wrong one", async () => {
    vi.stubEnv("ADMIN_TOKEN", TOKEN);
    const form = (t: string) => new Request("http://localhost/api/admin/session", { method: "POST", body: new URLSearchParams({ token: t }) });
    const bad = await signIn(form("wrong"));
    expect(bad.status).toBe(303);
    expect(bad.headers.get("location")).toContain("error=wrong");
    expect(bad.headers.get("set-cookie")).toBeNull();
    const good = await signIn(form(TOKEN));
    expect(good.headers.get("set-cookie")).toMatch(/HttpOnly/);
  });
});
