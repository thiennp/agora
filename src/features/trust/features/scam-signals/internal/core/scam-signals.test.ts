import { describe, expect, it } from "vitest";
import { scoreSignals } from "./scam-signals";

const m = (text: string, kinds: ("payment" | "phone" | "email" | "handle" | "link" | "address")[] = []) => ({ text, kinds });

describe("scam signals", () => {
  it("scores nothing for a normal conversation", () => {
    expect(scoreSignals({ messages: [m("Hi, is it available?"), m("Saturday works")] })).toEqual({ score: 0, level: "none", signals: [] });
  });

  it("names each signal with an explanation (TRU-SIG-02)", () => {
    const r = scoreSignals({ messages: [m("Pay first, hurry!", ["payment"]), m("What's your address?")], cancellations: 3, listingMismatch: true });
    expect(r.signals.map((s) => s.id).sort()).toEqual(["address_harvesting", "listing_mismatch", "off_platform_payment", "pressure", "repeated_cancellations"]);
    expect(r.level).toBe("high");
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("keeps a single weak signal below high (TRU-SIG-03)", () => {
    expect(scoreSignals({ messages: [m("mail me", ["email"])] }).level).toBe("none");
    expect(scoreSignals({ messages: [m("so urgent")] }).level).toBe("none");
    expect(scoreSignals({ messages: [m("pay first", ["payment"])] }).level).toBe("watch");
    expect(scoreSignals({ messages: [], cancellations: 2 }).signals).toEqual([]);
  });
});
