import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { getPlatform } from "@/app/_composition/platform";
import { dealList, itemsView } from "@/app/_composition/views";
import { POST as reset } from "./demo/reset/route";
import { POST as addItem } from "./items/route";
import { POST as withdraw } from "./items/[itemId]/withdraw/route";
import { POST as startDeal } from "./matches/start/route";

const post = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;

describe("items and matches", () => {
  beforeEach(async () => {
    resetRateLimit();
    await reset(post({}), ctx({}));
  });

  it("lists an offer and a want, shows the match, and the wanting owner starts a second deal", async () => {
    const offer = await j(await addItem(post({ as: "a", kind: "offer", category: "toys", condition: "good", description: "Wooden blocks" }), ctx({})));
    const want = await j(await addItem(post({ as: "b", kind: "want", category: "toys" }), ctx({})));
    const p = await getPlatform();

    const view = await itemsView(p, "b");
    const mine = view.items.find((i) => i.id === want.id)!;
    expect(mine.matches.map((m) => m.offerItemId)).toEqual([offer.id]);
    expect(view.options.categories.map((c) => c.id)).toContain("toys");

    // Mia cannot start a deal for Jonas's want, and an offer that is not a match cannot be used.
    expect((await startDeal(post({ as: "a", wantItemId: want.id, offerItemId: offer.id }), ctx({}))).status).toBe(403);
    expect((await startDeal(post({ as: "b", wantItemId: want.id, offerItemId: "nope" }), ctx({}))).status).toBe(409);

    const started = await startDeal(post({ as: "b", wantItemId: want.id, offerItemId: offer.id }), ctx({}));
    expect(started.status).toBe(200);
    const { dealId } = await j(started);
    const ids = (await dealList(p, "b")).map((d) => d.id);
    expect(ids).toContain(dealId);
    expect(ids.length).toBe(2);
    expect((await dealList(p, "a")).map((d) => d.id)).toContain(dealId);
  });

  it("refuses forbidden items, flags missing safety facts, and lets only the owner withdraw", async () => {
    const bad = await addItem(post({ as: "a", kind: "offer", category: "furniture", condition: "good", description: "a drop-side cot" }), ctx({}));
    expect(bad.status).toBe(400);
    expect((await j(bad)).error.code).toBe("forbidden_item");

    const seat = await j(await addItem(post({ as: "a", kind: "offer", category: "car-seat", condition: "good" }), ctx({})));
    expect(seat.flags.join(" ")).toMatch(/crash history/i);

    expect((await withdraw(post({ as: "b" }), ctx({ itemId: seat.id }))).status).toBe(403);
    expect((await withdraw(post({ as: "a" }), ctx({ itemId: seat.id }))).status).toBe(200);
    const p = await getPlatform();
    expect((await itemsView(p, "a")).items.map((i) => i.id)).not.toContain(seat.id);

    expect((await addItem(post({ as: "a", kind: "offer", category: "hovercraft", condition: "good" }), ctx({}))).status).toBe(400);
  });
});
