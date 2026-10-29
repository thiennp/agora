import { afterEach, describe, expect, it } from "vitest";
import { GET as getDeal } from "./deals/[dealId]/route";
import { POST as confirm } from "./deals/[dealId]/confirm/route";
import { POST as relay } from "./deals/[dealId]/relay/route";
import { POST as handoff } from "./deals/[dealId]/handoff/route";
import { POST as answer } from "./owner-questions/[questionId]/answer/route";
import { createTestApp, ctx, endWorld, j, resetWorld, startJacketDeal, type TestApp } from "./test-support";

/**
 * Platform rules that must hold across the whole owner journey, whatever slice produced the data (CLAUDE.md "Rules that never
 * depend on the app"). Each test tries to break one rule through the real route handlers, with a canary string that
 * must never appear where the rule forbids it.
 */
let t: TestApp;
const post = (as: "a" | "b", body: unknown) => t.post(t[as], "/x", body);
const view = async (id: string, as: "a" | "b") => j(await getDeal(t.get(t[as], `/api/deals/${id}`), ctx({ dealId: id })));

async function freshDeal() {
  resetWorld();
  t = await createTestApp();
  return (await startJacketDeal(t)).dealId;
}

/** Answer every open owner question with yes, then both owners confirm: the deal is now in the handover step. */
async function confirmBoth(id: string) {
  const platform = t.platform;
  for (let i = 0; i < 4; i++) {
    for (const [who, as] of [[t.a.id, "a"], [t.b.id, "b"]] as const) {
      for (const q of platform.cards.questionsFor(who)) await answer(post(as, { answer: "yes" }), ctx({ questionId: q.id }));
    }
  }
  const mia = platform.cards.confirmationsFor(t.a.id)[0]!;
  const jonas = platform.cards.confirmationsFor(t.b.id)[0]!;
  await confirm(post("a", { cardId: mia.id, decision: "confirm" }), ctx({ dealId: id }));
  await confirm(post("b", { cardId: jonas.id, decision: "confirm" }), ctx({ dealId: id }));
  expect((await view(id, "a")).deal.state).toBe("confirmed");
}

/** Members share one coarse district, so the agents propose a locker; an in-person pickup has to be asked for. */
async function switchToPickup(id: string) {
  await t.platform.logistics.propose(id, t.a.id, "pickup");
  expect((await view(id, "a")).handoff.mode).toBe("pickup");
}

describe("platform invariants", () => {
  afterEach(endWorld);

  it("shows the exact meeting place to the other owner only after both approved the way to hand over", async () => {
    const id = await freshDeal();
    await confirmBoth(id);
    await switchToPickup(id);
    const place = "Rosenweg 12 behind the bakery";
    expect((await handoff(post("a", { action: "place", value: place  }), ctx({ dealId: id }))).status).toBe(200);

    // The giver wrote it; the receiver must not see it yet (nothing approved, then only one approval).
    expect(JSON.stringify(await view(id, "b"))).not.toContain("Rosenweg");
    await handoff(post("a", { action: "approve" }), ctx({ dealId: id }));
    expect(JSON.stringify(await view(id, "b"))).not.toContain("Rosenweg");

    await handoff(post("b", { action: "approve" }), ctx({ dealId: id }));
    expect(JSON.stringify(await view(id, "b"))).toContain("Rosenweg");
  });

  it("lets only the owner who gives the item write the meeting place", async () => {
    const id = await freshDeal();
    await confirmBoth(id);
    await switchToPickup(id);
    const res = await handoff(post("b", { action: "place", value: "Elm Street 9" }), ctx({ dealId: id }));
    expect(res.status).toBe(403);
    expect((await j(res)).error.code).toBe("not_host");
    expect(JSON.stringify(await view(id, "a"))).not.toContain("Elm Street");
  });

  it("keeps message text out of the audit counters and the live feed (logs hold decisions and counts)", async () => {
    const id = await freshDeal();
    const canary = "ZEBRA-CANARY-7731";
    await relay(post("a", { text: `Is Saturday fine? ${canary}` }), ctx({ dealId: id }));
    await relay(post("b", { text: `Ja, passt. ${canary}` }), ctx({ dealId: id }));
    await relay(post("a", { text: `Call 0170 1234567 ${canary}` }), ctx({ dealId: id })); // redacted
    await relay(post("a", { text: `Pay first by PayPal ${canary}` }), ctx({ dealId: id })); // blocked
    const platform = t.platform;
    expect(JSON.stringify(platform.audit)).not.toContain(canary);
    expect(JSON.stringify(platform.feed)).not.toContain(canary);
  });

  it("never lets a phone number or a payment request reach the other owner, in the original or the translation", async () => {
    const id = await freshDeal();
    await relay(post("a", { text: "Call me on 0170 1234567" }), ctx({ dealId: id }));
    await relay(post("a", { text: "Please pay first via PayPal" }), ctx({ dealId: id }));
    const seenByJonas = JSON.stringify((await view(id, "b")).conversation);
    expect(seenByJonas).not.toMatch(/0170|1234567|PayPal/);
  });
});
