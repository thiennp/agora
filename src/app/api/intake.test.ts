import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { getPlatform } from "@/app/_composition/platform";
import { itemsView } from "@/app/_composition/views";
import { POST as reset } from "./demo/reset/route";
import { POST as photo } from "./intake/photo/route";
import { POST as addItem } from "./items/route";
import { POST as withdraw } from "./items/[itemId]/withdraw/route";

const post = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;
const dataUrl = (b: Buffer, type = "jpeg") => `data:image/${type};base64,${b.toString("base64")}`;
const busy = () => sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 60 } } }).jpeg().toBuffer();

describe("photo intake over the API (demo mode: simulated models)", () => {
  let dir: string;
  let file: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "agora-intake-"));
    file = join(dir, "state.json");
    process.env.AGORA_STATE_FILE = file;
  });
  afterAll(async () => {
    delete process.env.AGORA_STATE_FILE;
    await reset(post({}), ctx({}));
    await rm(dir, { recursive: true, force: true });
  });
  beforeEach(async () => {
    resetRateLimit();
    await reset(post({}), ctx({}));
  });

  it("turns a photo into drafts, lists one with its picture, shows it on the item, and drops it on withdraw", async () => {
    const r = await j(await photo(post({ as: "a", image: dataUrl(await busy()) }), ctx({})));
    expect(r).toMatchObject({ status: "ok", simulated: true, capped: false });
    expect(r.drafts.length).toBe(3);
    const draft = r.drafts[0];
    expect(draft.crop).toMatch(/^data:image\/jpeg;base64,/);

    const listed = await j(await addItem(post({ as: "a", kind: "offer", category: draft.category, condition: "good", description: draft.name, draftId: draft.id }), ctx({})));
    const p = await getPlatform();
    expect((await itemsView(p, "a")).items.find((i) => i.id === listed.id)!.crop).toBe(draft.crop);
    // Jonas sees nothing of it, and the draft cannot be claimed twice or by someone else.
    expect((await itemsView(p, "b")).items.some((i) => i.id === listed.id)).toBe(false);
    const again = await j(await addItem(post({ as: "a", kind: "offer", category: "toys", condition: "good", draftId: draft.id }), ctx({})));
    expect((await itemsView(p, "a")).items.find((i) => i.id === again.id)!.crop).toBeNull();

    expect((await withdraw(post({ as: "a" }), ctx({ itemId: listed.id }))).status).toBe(200);
    expect(p.intake.crops.forItem(listed.id)).toBeUndefined();
  });

  it("never lets another owner claim a draft's picture", async () => {
    const r = await j(await photo(post({ as: "a", image: dataUrl(await busy()) }), ctx({})));
    const stolen = await j(await addItem(post({ as: "b", kind: "offer", category: "toys", condition: "good", draftId: r.drafts[0].id }), ctx({})));
    const p = await getPlatform();
    expect((await itemsView(p, "b")).items.find((i) => i.id === stolen.id)!.crop).toBeNull();
  });

  it("keeps neither the photo nor any picture in the saved state", async () => {
    const original = await busy();
    const r = await j(await photo(post({ as: "a", image: dataUrl(original) }), ctx({})));
    const draft = r.drafts[0];
    await addItem(post({ as: "a", kind: "offer", category: draft.category, condition: "good", description: draft.name, draftId: draft.id }), ctx({}));
    const saved = await readFile(file, "utf8");
    expect(saved).toContain(draft.name);
    expect(saved).not.toContain(original.toString("base64").slice(2000, 2200));
    expect(saved).not.toContain(draft.crop.split(",")[1].slice(2000, 2200));
    expect(saved).not.toMatch(/data:image/);
  });

  it("answers a bad photo with a status the page can explain, and refuses what is not an image", async () => {
    const dark = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 5, g: 5, b: 5 } } }).jpeg().toBuffer();
    expect(await j(await photo(post({ as: "a", image: dataUrl(dark) }), ctx({})))).toMatchObject({ status: "retake", reason: "too_dark" });
    expect(await j(await photo(post({ as: "a", image: dataUrl(Buffer.from("not a photo")) }), ctx({})))).toMatchObject({ status: "unreadable" });
    const bad = await photo(post({ as: "a", image: "http://example.test/x.jpg" }), ctx({}));
    expect(bad.status).toBe(400);
    expect((await j(bad)).error.code).toBe("invalid_input");
    expect((await photo(post({ as: "c", image: dataUrl(await busy()) }), ctx({}))).status).toBe(400);
  });
});
