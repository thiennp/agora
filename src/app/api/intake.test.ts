import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { itemsView } from "@/app/_composition/views";
import { POST as photo } from "./intake/photo/route";
import { POST as addItem } from "./items/route";
import { POST as withdraw } from "./items/[itemId]/withdraw/route";
import { createTestApp, ctx, endWorld, j, resetWorld, simulatedTranslation, type TestApp } from "./test-support";

const dataUrl = (b: Buffer, type = "jpeg") => `data:image/${type};base64,${b.toString("base64")}`;
const busy = () => sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 60 } } }).jpeg().toBuffer();

/**
 * The vision model and SAM are stood in for: the model double names three items and finds no person or text, and the SAM request
 * (a plain fetch to the Meta Model API) is answered with one box per concept. Nothing here reaches the network.
 */
const labelJson = JSON.stringify({
  photo: "ok",
  items: [
    { name: "winter jacket", concept: "jacket", category: "clothing", size: null, condition: "good", quantity: 1, confidence: 0.9, showsPerson: false, showsReadableText: false },
    { name: "board book", concept: "board book", category: "toys", size: null, condition: "good", quantity: 1, confidence: 0.9, showsPerson: false, showsReadableText: false },
    { name: "wooden cot", concept: "cot", category: "furniture", size: null, condition: "good", quantity: 1, confidence: 0.9, showsPerson: false, showsReadableText: false },
  ],
});
const intakeAdapter = () =>
  simulatedTranslation((req) => {
    if (req.system.includes("last privacy check")) return JSON.stringify({ showsPerson: false, showsReadableText: false });
    if (req.system.includes("list each separate item")) return labelJson;
    return undefined;
  });
const SLOTS = [[40, 40, 500, 500], [540, 40, 1100, 450], [100, 540, 1000, 850]];
function stubSam() {
  let n = 0;
  vi.stubGlobal("fetch", async () => {
    const [x1, y1, x2, y2] = SLOTS[n++ % SLOTS.length]!;
    const text = `1f 1<|box;x1=${x1};y1=${y1};x2=${x2};y2=${y2};w=1200;h=900;c=0.95|>`;
    return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text }] }] }), { status: 200 });
  });
}

describe("photo intake over the API (stood-in models)", () => {
  let t: TestApp;
  let dir: string;
  let file: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "agora-intake-"));
    file = join(dir, "state.json");
    process.env.AGORA_STATE_FILE = file;
  });
  afterAll(async () => {
    delete process.env.AGORA_STATE_FILE;
    await rm(dir, { recursive: true, force: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    endWorld();
  });
  beforeEach(async () => {
    resetWorld(intakeAdapter());
    stubSam();
    t = await createTestApp();
  });

  it("turns a photo into drafts, lists one with its picture, shows it on the item, and drops it on withdraw", async () => {
    const r = await j(await photo(t.post(t.a, "/x", { image: dataUrl(await busy()) }), ctx()));
    expect(r).toMatchObject({ status: "ok", simulated: false, capped: false });
    expect(r.drafts.length).toBe(3);
    const draft = r.drafts[0];
    expect(draft.crop).toMatch(/^data:image\/jpeg;base64,/);

    const listed = await j(await addItem(t.post(t.a, "/x", { kind: "offer", category: draft.category, condition: "good", description: draft.name, draftId: draft.id }), ctx()));
    const p = t.platform;
    expect((await itemsView(t.scoped(t.a), "a")).items.find((i) => i.id === listed.id)!.crop).toBe(draft.crop);
    // The other member sees nothing of it, and the draft cannot be claimed twice or by someone else.
    expect((await itemsView(t.scoped(t.b), "b")).items.some((i) => i.id === listed.id)).toBe(false);
    const again = await j(await addItem(t.post(t.a, "/x", { kind: "offer", category: "toys", condition: "good", draftId: draft.id }), ctx()));
    expect((await itemsView(t.scoped(t.a), "a")).items.find((i) => i.id === again.id)!.crop).toBeNull();

    expect((await withdraw(t.post(t.a, "/x", {}), ctx({ itemId: listed.id }))).status).toBe(200);
    expect(p.intake.crops.forItem(listed.id)).toBeUndefined();
  });

  it("never lets another owner claim a draft's picture", async () => {
    const r = await j(await photo(t.post(t.a, "/x", { image: dataUrl(await busy()) }), ctx()));
    const stolen = await j(await addItem(t.post(t.b, "/x", { kind: "offer", category: "toys", condition: "good", draftId: r.drafts[0].id }), ctx()));
    expect((await itemsView(t.scoped(t.b), "b")).items.find((i) => i.id === stolen.id)!.crop).toBeNull();
  });

  it("keeps neither the photo nor any picture in the saved state", async () => {
    const original = await busy();
    const r = await j(await photo(t.post(t.a, "/x", { image: dataUrl(original) }), ctx()));
    const draft = r.drafts[0];
    await addItem(t.post(t.a, "/x", { kind: "offer", category: draft.category, condition: "good", description: draft.name, draftId: draft.id }), ctx());
    const saved = await readFile(`${file}.${t.appId}`, "utf8");
    expect(saved).toContain(draft.name);
    expect(saved).not.toContain(original.toString("base64").slice(2000, 2200));
    expect(saved).not.toContain(draft.crop.split(",")[1].slice(2000, 2200));
    expect(saved).not.toMatch(/data:image/);
  });

  it("answers a bad photo with a status the page can explain, and refuses what is not an image", async () => {
    const dark = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 5, g: 5, b: 5 } } }).jpeg().toBuffer();
    expect(await j(await photo(t.post(t.a, "/x", { image: dataUrl(dark) }), ctx()))).toMatchObject({ status: "retake", reason: "too_dark" });
    expect(await j(await photo(t.post(t.a, "/x", { image: dataUrl(Buffer.from("not a photo")) }), ctx()))).toMatchObject({ status: "unreadable" });
    const bad = await photo(t.post(t.a, "/x", { image: "http://example.test/x.jpg" }), ctx());
    expect(bad.status).toBe(400);
    expect((await j(bad)).error.code).toBe("invalid_input");
    expect((await photo(t.post(t.a, "/x", { as: "c", image: dataUrl(await busy()) }), ctx())).status).toBe(400);
  });
});
