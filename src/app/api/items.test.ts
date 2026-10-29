import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dealList, itemsView } from "@/app/_composition/views";
import { POST as addItem } from "./items/route";
import { POST as withdraw } from "./items/[itemId]/withdraw/route";
import { POST as startDeal } from "./matches/start/route";

import { createTestApp, ctx, endWorld, j, resetWorld, type TestApp } from "./test-support";

let t: TestApp;

describe("items and matches", () => {
  afterEach(endWorld);
  beforeEach(async () => {
    resetWorld();
    t = await createTestApp();
  });

  it("lists an offer and a want, shows the match, and the wanting owner starts a deal", async () => {
    const offer = await j(await addItem(t.post(t.a, "/api/items", { kind: "offer", category: "toys", condition: "good", description: "Wooden blocks" }), ctx()));
    const want = await j(await addItem(t.post(t.b, "/api/items", { kind: "want", category: "toys" }), ctx()));

    const view = await itemsView(t.scoped(t.b), "b");
    const mine = view.items.find((i) => i.id === want.id)!;
    expect(mine.matches.map((m) => m.offerItemId)).toEqual([offer.id]);
    expect(view.options.categories.map((c) => c.id)).toContain("toys");

    // Mia cannot start a deal for Jonas's want, and an offer that is not a match cannot be used.
    expect((await startDeal(t.post(t.a, "/api/matches/start", { wantItemId: want.id, offerItemId: offer.id }), ctx())).status).toBe(403);
    expect((await startDeal(t.post(t.b, "/api/matches/start", { wantItemId: want.id, offerItemId: "nope" }), ctx())).status).toBe(409);

    const started = await startDeal(t.post(t.b, "/api/matches/start", { wantItemId: want.id, offerItemId: offer.id }), ctx());
    expect(started.status).toBe(200);
    const { dealId } = await j(started);
    const ids = (await dealList(t.scoped(t.b), "b")).map((d) => d.id);
    expect(ids).toEqual([dealId]);
    expect((await dealList(t.scoped(t.a), "a")).map((d) => d.id)).toContain(dealId);
  });

  it("refuses forbidden items, flags missing safety facts, and lets only the owner withdraw", async () => {
    const bad = await addItem(t.post(t.a, "/api/items", { kind: "offer", category: "furniture", condition: "good", description: "a drop-side cot" }), ctx());
    expect(bad.status).toBe(400);
    expect((await j(bad)).error.code).toBe("forbidden_item");

    const seat = await j(await addItem(t.post(t.a, "/api/items", { kind: "offer", category: "car-seat", condition: "good" }), ctx()));
    expect(seat.flags.join(" ")).toMatch(/crash history/i);

    expect((await withdraw(t.post(t.b, "/x", {}), ctx({ itemId: seat.id }))).status).toBe(403);
    expect((await withdraw(t.post(t.a, "/x", {}), ctx({ itemId: seat.id }))).status).toBe(200);
    expect((await itemsView(t.scoped(t.a), "a")).items.map((i) => i.id)).not.toContain(seat.id);

    expect((await addItem(t.post(t.a, "/api/items", { kind: "offer", category: "hovercraft", condition: "good" }), ctx())).status).toBe(400);
  });
});
