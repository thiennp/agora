import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createIntake, MAX_ITEMS } from "../../public-api/infrastructure";
import { createSimulatedPorts, type IntakePorts } from "./ports";

const catalog = {
  categories: [
    { id: "clothing", label: "Clothing", hints: ["jacket"] },
    { id: "toys", label: "Toys and books", hints: ["board book"] },
    { id: "furniture", label: "Furniture", hints: ["cot"] },
  ],
  sizeSystems: { clothing: ["68", "98"] },
  conditions: ["new", "good", "worn"],
};
const photo = () => sharp({ create: { width: 1000, height: 800, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 60 } } }).jpeg().toBuffer();
const item = (o: Record<string, unknown> = {}) => ({ name: "winter jacket", concept: "jacket", category: "clothing", size: "98", condition: "good", quantity: 1, confidence: 0.9, showsPerson: false, showsReadableText: false, ...o });
const box = (x1: number, y1: number, x2: number, y2: number, confidence = 0.9) => ({ x1, y1, x2, y2, width: 1000, height: 800, confidence });
const ports = (items: ReturnType<typeof item>[], boxes: ReturnType<typeof box>[][], over: Partial<IntakePorts> = {}): IntakePorts & { asked: string[] } => {
  const asked: string[] = [];
  return {
    simulated: false,
    asked,
    label: async () => ({ photo: "ok", items }),
    locate: async (_i, concepts) => {
      asked.push(...concepts);
      return concepts.map((_c, n) => ({ boxes: boxes[n] ?? [], failed: false }));
    },
    ...over,
  };
};

describe("photo intake pipeline", () => {
  it("turns a photo into one draft per item, each with its own small picture, and keeps nothing else", async () => {
    const p = ports([item(), item({ name: "board book", concept: "board book", category: "toys", size: null, confidence: 0.95 })], [[box(100, 100, 500, 600)], [box(600, 100, 900, 300)]]);
    const intake = createIntake({ catalog, ports: p });
    const original = await photo();
    const r = await intake.analyze("mia", original);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.drafts.map((d) => [d.name, d.category, d.size ?? null, d.needsCheck])).toEqual([["winter jacket", "clothing", "98", false], ["board book", "toys", null, false]]);
    for (const d of r.drafts) {
      expect(d.crop).toMatch(/^data:image\/jpeg;base64,/);
      const m = await sharp(Buffer.from(d.crop!.split(",")[1]!, "base64")).metadata();
      expect(Math.max(m.width!, m.height!)).toBeLessThanOrEqual(480);
      expect(m.exif).toBeUndefined();
    }
    expect(intake.crops.counts()).toEqual({ drafts: 2, items: 0 });
    expect(r.simulated).toBe(false);
  });

  it("overwrites the original photo bytes: nothing readable is left after the call", async () => {
    const intake = createIntake({ catalog, ports: ports([item()], [[box(100, 100, 500, 600)]]) });
    const original = await photo();
    expect(original.some((b) => b !== 0)).toBe(true);
    await intake.analyze("mia", original);
    expect(original.every((b) => b === 0)).toBe(true);
  });

  it("sends the models only the shrunk copy, never the original size", async () => {
    let seen = "";
    const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 60 } } }).jpeg().toBuffer();
    const p = ports([item()], [[box(100, 100, 500, 600)]], { label: async (img) => { seen = img; return { photo: "ok", items: [item()] }; } });
    await createIntake({ catalog, ports: p }).analyze("mia", big);
    const m = await sharp(Buffer.from(seen.split(",")[1]!, "base64")).metadata();
    expect([m.width, m.height]).toEqual([1600, 1067]);
  });

  it("keeps no picture when a person or readable text is in the item's area, and does not even ask SAM to outline it", async () => {
    const p = ports([item({ showsPerson: true }), item({ name: "box", concept: "box", showsReadableText: true }), item({ name: "hat", concept: "hat" })], [[], [], [box(100, 100, 500, 600)]]);
    const r = await createIntake({ catalog, ports: p }).analyze("mia", await photo());
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.drafts.map((d) => [d.noCropReason ?? "crop", d.needsCheck])).toEqual([["person", true], ["text", true], ["crop", false]]);
    expect(p.asked).toEqual(["", "", "hat"]);
  });

  it("marks guesses for checking instead of trusting them: unknown category, missing size, low confidence", async () => {
    const p = ports([item({ category: "spaceships" }), item({ size: null }), item({ size: "92" }), item({ confidence: 0.4 }), item({ category: "toys", size: null, condition: "mint" })], [[box(10, 10, 300, 300)], [box(10, 10, 300, 300)], [box(10, 10, 300, 300)], [box(10, 10, 300, 300)], [box(10, 10, 300, 300)]]);
    const r = await createIntake({ catalog, ports: p }).analyze("mia", await photo());
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.drafts.map((d) => [d.category, d.size ?? null, d.condition ?? null, d.needsCheck])).toEqual([
      ["clothing", "98", "good", true],
      ["clothing", null, "good", true],
      ["clothing", null, "good", true],
      ["clothing", "98", "good", true],
      ["toys", null, null, false],
    ]);
  });

  it("says when it found no outline for an item, and still returns the draft", async () => {
    const r = await createIntake({ catalog, ports: ports([item()], [[]]) }).analyze("mia", await photo());
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.drafts[0]).toMatchObject({ noCropReason: "no_outline", needsCheck: true });
    expect(r.drafts[0]!.crop).toBeUndefined();
  });

  it("makes one draft for a pair found as two boxes, and one per item when the count matches", async () => {
    const two = [box(100, 100, 300, 400), box(500, 100, 700, 400)];
    const pair = await createIntake({ catalog, ports: ports([item({ name: "boots", concept: "boots" })], [two]) }).analyze("mia", await photo());
    if (pair.status !== "ok") throw new Error("expected ok");
    expect(pair.drafts).toHaveLength(1);
    const twins = await createIntake({ catalog, ports: ports([item({ name: "onesie", concept: "onesie", quantity: 2 })], [two]) }).analyze("mia", await photo());
    if (twins.status !== "ok") throw new Error("expected ok");
    expect(twins.drafts.map((d) => d.name)).toEqual(["onesie (1 of 2)", "onesie (2 of 2)"]);
  });

  it("caps the number of items and says so", async () => {
    const many = Array.from({ length: MAX_ITEMS + 3 }, (_, i) => item({ name: `thing ${i}`, concept: `thing ${i}` }));
    const r = await createIntake({ catalog, ports: ports(many, many.map(() => [box(10, 10, 300, 300)])) }).analyze("mia", await photo());
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.drafts).toHaveLength(MAX_ITEMS);
    expect(r.capped).toBe(true);
  });

  it("asks for a retake, before any model is called, for a dark or blurry photo", async () => {
    let calls = 0;
    const p = ports([item()], [], { label: async () => { calls++; return { photo: "ok", items: [] }; } });
    const intake = createIntake({ catalog, ports: p });
    const dark = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 6, g: 6, b: 6 } } }).jpeg().toBuffer();
    expect(await intake.analyze("mia", dark)).toMatchObject({ status: "retake", reason: "too_dark" });
    const blurry = await sharp(await photo()).blur(25).jpeg().toBuffer();
    expect(await intake.analyze("mia", blurry)).toMatchObject({ status: "retake", reason: "blurry" });
    expect(calls).toBe(0);
  });

  it("follows the vision model's own verdict on the photo and an empty list", async () => {
    const bad = createIntake({ catalog, ports: ports([], [], { label: async () => ({ photo: "blurry", items: [] }) }) });
    expect(await bad.analyze("mia", await photo())).toMatchObject({ status: "retake", reason: "blurry" });
    const none = createIntake({ catalog, ports: ports([], []) });
    expect(await none.analyze("mia", await photo())).toMatchObject({ status: "retake", reason: "no_items" });
  });

  it("answers with a status, never an error, when the file is not a photo or the models are down", async () => {
    const intake = createIntake({ catalog, ports: ports([item()], [], { label: async () => { throw new Error("meta-api error 500"); } }) });
    expect(await intake.analyze("mia", Buffer.from("not a photo"))).toMatchObject({ status: "unreadable" });
    const r = await intake.analyze("mia", await photo());
    expect(r).toMatchObject({ status: "unavailable" });
    expect(JSON.stringify(r)).not.toMatch(/500|meta-api/);
  });

  it("still returns drafts, without pictures, when SAM fails", async () => {
    const p = ports([item()], [], { locate: async (_i, c) => c.map(() => ({ boxes: [], failed: true })) });
    const r = await createIntake({ catalog, ports: p }).analyze("mia", await photo());
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.drafts[0]).toMatchObject({ noCropReason: "no_outline" });
  });

  it("works offline in demo mode: sample items from the app's own categories, cut from fixed places, all marked for checking", async () => {
    const intake = createIntake({ catalog, ports: createSimulatedPorts(catalog) });
    const r = await intake.analyze("mia", await photo());
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.simulated).toBe(true);
    expect(r.drafts.map((d) => d.category)).toEqual(["clothing", "toys", "furniture"]);
    expect(r.drafts.every((d) => d.needsCheck && d.crop)).toBe(true);
  });
});
