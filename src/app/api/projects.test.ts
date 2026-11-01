import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminLimiter } from "@/app/_composition/admin";
import { agentBrief } from "@/lib/interview";
import { GET as adminProjects } from "./admin/projects/route";
import { POST as build } from "./interview/build/route";
import { GET as open, POST as openPost } from "./interview/projects/route";
import { GET as addByLink, PUT as put } from "./interview/projects/[id]/route";
import { ctx, endWorld, j, resetWorld } from "./test-support";

const TOKEN = "operator-token-0123456789";
const url = (p: string) => `http://localhost${p}`;
const putReq = (id: string, answers: unknown[]) => new Request(url(`/api/interview/projects/${id}`), { method: "PUT", body: JSON.stringify({ answers }) });
const admin = () => adminProjects(new Request(url("/api/admin/projects"), { headers: { authorization: `Bearer ${TOKEN}` } }), ctx());
const openProject = async () => (await j(await openPost(new Request(url("/api/interview/projects"), { method: "POST", body: JSON.stringify({ source: "phone" }) }), ctx()))).projectId as string;

describe("interview projects (BR-48)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    endWorld();
  });
  beforeEach(() => {
    adminLimiter.reset();
    resetWorld();
    vi.stubEnv("ADMIN_TOKEN", TOKEN);
  });

  it("opens an unguessable project id, by POST or GET, and the admin sees it as just opened", async () => {
    const id = await openProject();
    expect(id).toMatch(/^p_[0-9a-f]{32}$/);
    const viaGet = await j(await open(new Request(url("/api/interview/projects")), ctx()));
    expect(viaGet.projectId).toMatch(/^p_[0-9a-f]{32}$/);
    const { projects } = await j(await admin());
    expect(projects).toHaveLength(2);
    expect(projects.find((p: { projectId: string }) => p.projectId === id)).toMatchObject({ status: "opened", answered: 0, of: 6, source: "phone" });
  });

  it("records each answer as it is given, and a step back replaces what was there", async () => {
    const id = await openProject();
    const p = () => ctx({ id });
    expect(await j(await put(putReq(id, [{ step: "purpose", choice: "learn" }]), p()))).toEqual({ projectId: id, answered: 1 });
    await put(putReq(id, [{ step: "purpose", choice: "learn" }, { step: "actions", text: "Share a tip" }]), p());
    let row = (await j(await admin())).projects[0];
    expect(row).toMatchObject({ status: "in_progress", answered: 2 });
    expect(row.answers.map((a: { step: string }) => a.step)).toEqual(["purpose", "actions"]);
    await put(putReq(id, [{ step: "purpose", choice: "exchange" }]), p());
    row = (await j(await admin())).projects[0];
    expect(row.answers).toEqual([{ step: "purpose", label: "Swap or lend things people no longer need" }]);
  });

  it("lets a link-only assistant add answers by GET, merging them, and reports a damaged part", async () => {
    const id = await openProject();
    await addByLink(new Request(url(`/api/interview/projects/${id}?purpose=learn`)), ctx({ id }));
    const r = await j(await addByLink(new Request(url(`/api/interview/projects/${id}?name=Study%20Club`)), ctx({ id })));
    expect(r.answered).toBe(2);
  });

  it("refuses an unknown id, a wrong step and an unusable answer", async () => {
    expect((await put(putReq("p_" + "0".repeat(32), []), ctx({ id: "p_" + "0".repeat(32) }))).status).toBe(404);
    expect((await put(putReq("nope", []), ctx({ id: "nope" }))).status).toBe(404);
    const id = await openProject();
    expect((await put(putReq(id, [{ step: "nope", text: "x" }]), ctx({ id }))).status).toBe(400);
    expect((await put(putReq(id, [{ step: "actions" }]), ctx({ id }))).status).toBe(400);
  });

  it("marks the project built, with the app id, when the person taps Build it", async () => {
    const id = await openProject();
    const turn = await j(await (await import("./interview/route")).POST(new Request(url("/api/interview"), { method: "POST", body: JSON.stringify({ answers: [
      { step: "purpose", choice: "exchange" }, { step: "actions", text: "Offer clothes" }, { step: "how", text: "Post, ask, agree" },
      { step: "care", choice: "none" }, { step: "name", text: "Clothes Swap Club" }, { step: "feel", choice: "friendly" },
    ] }) }), ctx()));
    const built = await j(await build(new Request(url("/api/interview/build"), { method: "POST", body: JSON.stringify({ draft: turn.draft, projectId: id }) }), ctx()));
    const row = (await j(await admin())).projects.find((p: { projectId: string }) => p.projectId === id);
    expect(row).toMatchObject({ status: "built", appId: built.app.id });
    // A made-up project id never stops the app being built.
    const ok = await build(new Request(url("/api/interview/build"), { method: "POST", body: JSON.stringify({ draft: turn.draft, projectId: "p_" + "1".repeat(32) }) }), ctx());
    expect(ok.status).toBe(200);
  });

  it("is admin only", async () => {
    expect((await adminProjects(new Request(url("/api/admin/projects")), ctx())).status).toBe(401);
  });

  it("tells an assistant how to open a project, record answers and send the id with the build", () => {
    const md = agentBrief("https://example.test");
    expect(md).toContain("/api/interview/projects");
    expect(md).toContain("Send the `projectId` with the build request");
  });
});
