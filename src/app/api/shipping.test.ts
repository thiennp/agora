import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { getPlatform } from "@/app/_composition/platform";
import { POST as reset } from "./demo/reset/route";
import { GET as getDeal } from "./deals/[dealId]/route";
import { POST as confirm } from "./deals/[dealId]/confirm/route";
import { POST as handoff } from "./deals/[dealId]/handoff/route";
import { POST as answer } from "./owner-questions/[questionId]/answer/route";

const post = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;

async function confirmedDeal() {
  resetRateLimit();
  const { dealId } = await j(await reset(post({}), ctx({})));
  const p = await getPlatform();
  for (let i = 0; i < 4; i++) {
    for (const who of ["demo-mia", "demo-jonas"] as const) for (const q of p.cards.questionsFor(who)) await answer(post({ as: who === "demo-mia" ? "a" : "b", answer: "yes" }), ctx({ questionId: q.id }));
  }
  await confirm(post({ as: "a", cardId: p.cards.confirmationsFor("demo-mia")[0]!.id, decision: "confirm" }), ctx({ dealId }));
  await confirm(post({ as: "b", cardId: p.cards.confirmationsFor("demo-jonas")[0]!.id, decision: "confirm" }), ctx({ dealId }));
  return dealId as string;
}
const act = (dealId: string, body: unknown) => handoff(post(body), ctx({ dealId }));
const card = async (dealId: string, as: "a" | "b") => (await j(await getDeal(new Request(`http://localhost/x?as=${as}`), ctx({ dealId })))).handoff;

describe("shipping from the deal room", () => {
  beforeEach(() => resetRateLimit());

  it("switches to shipping, collects the address from the recipient only, and shows the label to the sender only", async () => {
    const id = await confirmedDeal();
    expect((await act(id, { as: "a", action: "propose", mode: "shipping" })).status).toBe(200);
    expect((await card(id, "b")).mode).toBe("shipping");
    expect((await act(id, { as: "b", action: "approve" })).status).toBe(200);
    expect((await card(id, "a")).state).toBe("approved");

    // the sender cannot give the recipient's address, and cannot make a label before it exists
    expect((await act(id, { as: "a", action: "address", value: "Hauptstrasse 12, 10115 Berlin" })).status).toBe(403);
    expect((await act(id, { as: "a", action: "label" })).status).toBe(400);

    expect((await act(id, { as: "b", action: "address", value: "Hauptstrasse 12, 10115 Berlin" })).status).toBe(200);
    expect((await act(id, { as: "b", action: "fee", senderPct: 50, note: "split it" })).status).toBe(200);
    expect((await act(id, { as: "b", action: "label" })).status).toBe(400); // only the sender may make the label
    expect((await act(id, { as: "a", action: "label" })).status).toBe(200);

    const sender = await card(id, "a");
    const recipient = await card(id, "b");
    expect(sender.shipment.labelText).toContain("SIMULATED TEST LABEL");
    expect(sender.shipment.feeSplit).toMatchObject({ senderPct: 50, recipientPct: 50 });
    expect(recipient.shipment.labelText).toBeUndefined();
    // the address never appears in anything the sender's card or the recipient's card exposes besides the label
    expect(JSON.stringify(recipient)).not.toContain("Hauptstrasse");
    expect(JSON.stringify({ ...sender, shipment: { ...sender.shipment, labelText: undefined } })).not.toContain("Hauptstrasse");

    expect((await act(id, { as: "a", action: "track" })).status).toBe(200);
    expect((await card(id, "a")).shipment.status).toBeTruthy();
  });

  it("refuses a way to hand over the app does not allow, and a fee split that is not two whole percentages", async () => {
    const id = await confirmedDeal();
    expect((await act(id, { as: "a", action: "propose", mode: "teleport" })).status).toBe(400);
    expect((await act(id, { as: "a", action: "fee", senderPct: 150 })).status).toBe(400);
  });
});
