import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createCatalogService, ItemError } from "./infrastructure";

async function setup(id = "kids-gear") {
  const consent = new Set<string>();
  const catalog = createCatalogService({ app: await loadApp(id), canShare: (f) => consent.has(f) });
  return { catalog, consent };
}
const offer = { kind: "offer", category: "clothing", size: "68", condition: "good", description: "Winter jacket" } as const;

describe("catalog items", () => {
  it("creates drafts that nobody else can see", async () => {
    const { catalog, consent } = await setup();
    const i = await catalog.items.create("f1", offer);
    expect(i.status).toBe("draft");
    consent.add("f1");
    expect(await catalog.items.visibleListings()).toEqual([]);
  });

  it("refuses to list without consent, lists with it, and hides again if consent is withdrawn", async () => {
    const { catalog, consent } = await setup();
    const i = await catalog.items.create("f1", offer);
    await expect(catalog.items.list(i.id)).rejects.toMatchObject({ code: "no_consent" });
    consent.add("f1");
    await catalog.items.list(i.id);
    expect(await catalog.items.visibleListings()).toHaveLength(1);
    consent.delete("f1");
    expect(await catalog.items.visibleListings()).toHaveLength(0);
  });

  it("validates against the app catalog: category, size system, condition", async () => {
    const { catalog } = await setup();
    await expect(catalog.items.create("f1", { ...offer, category: "spaceship" })).rejects.toMatchObject({ code: "invalid" });
    await expect(catalog.items.create("f1", { ...offer, size: "999" })).rejects.toMatchObject({ code: "invalid" });
    await expect(catalog.items.create("f1", { ...offer, condition: undefined })).rejects.toMatchObject({ code: "invalid" });
    const want = await catalog.items.create("f1", { kind: "want", category: "toys" });
    expect(want.kind).toBe("want");
  });

  it("blocks forbidden items from the app config", async () => {
    const { catalog } = await setup("garden-tools");
    await expect(
      catalog.items.create("g1", { kind: "offer", category: "hand-tools", condition: "good", description: "half a bottle of weed killer" }),
    ).rejects.toMatchObject({ code: "forbidden_item" });
  });

  it("flags missing safety facts and clears them when provided", async () => {
    const { catalog } = await setup();
    const seat = { kind: "offer", category: "car-seat", condition: "good" } as const;
    expect((await catalog.items.create("f1", seat)).safetyFlags[0]).toMatchObject({ ruleId: "car-seat-crash-history", missing: ["crash-history", "manufacture-date"] });
    const ok = await catalog.items.create("f1", { ...seat, attributes: { "crash-history": "none", "manufacture-date": "2024-05" } });
    expect(ok.safetyFlags).toEqual([]);
  });

  it("follows the lifecycle and only allows withdrawal before confirmation", async () => {
    const { catalog, consent } = await setup();
    consent.add("f1");
    const i = await catalog.items.create("f1", offer);
    await expect(catalog.items.markInDeal(i.id)).rejects.toMatchObject({ code: "bad_transition" });
    await catalog.items.list(i.id);
    await catalog.items.markInDeal(i.id);
    await catalog.items.reserve(i.id, "deal-1");
    await expect(catalog.items.withdraw(i.id)).rejects.toMatchObject({ code: "bad_transition" });
    await expect(catalog.items.edit(i.id, offer)).rejects.toBeInstanceOf(ItemError);
    await catalog.items.complete(i.id);
  });

  it("allows an item in only one confirmed deal (CAT-03)", async () => {
    const { catalog, consent } = await setup();
    consent.add("f1");
    const i = await catalog.items.create("f1", offer);
    await catalog.items.list(i.id);
    await catalog.items.markInDeal(i.id);
    await catalog.items.reserve(i.id, "deal-1");
    await expect(catalog.items.reserve(i.id, "deal-2")).rejects.toMatchObject({ code: "already_confirmed" });
    expect((await catalog.items.get(i.id))?.reservedDealId).toBe("deal-1");
  });

  it("withdrawn items leave matching immediately and erase removes everything", async () => {
    const { catalog, consent } = await setup();
    consent.add("f1");
    const a = await catalog.items.create("f1", offer);
    await catalog.items.list(a.id);
    await catalog.items.withdraw(a.id);
    expect(await catalog.items.visibleListings()).toEqual([]);
    await catalog.erase("f1");
    expect(await catalog.items.listForFamily("f1")).toEqual([]);
  });
});
