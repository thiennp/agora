import { createSimulatedCarrier, WATERMARK } from "./simulated.carrier";
import { runCarrierContract } from "./carrier.contract";
import { describe, expect, it } from "vitest";

runCarrierContract("simulated", () => {
  let t = new Date("2026-11-01T12:00:00Z").getTime();
  return { carrier: createSimulatedCarrier({ now: () => new Date(t) }), advance: (h) => void (t += h * 3_600_000) };
});

describe("simulated carrier", () => {
  it("watermarks every label and tracks by the clock", async () => {
    let t = new Date("2026-11-02T09:00:00Z").getTime();
    const c = createSimulatedCarrier({ now: () => new Date(t) });
    const l = await c.createLabel({ shipmentId: "x", fromDistrict: "n:a", toAddress: "Somewhere 1", toDistrict: "n:b", description: "d" });
    expect(l.labelText.startsWith(WATERMARK)).toBe(true);
    await c.bookAppointment({ shipmentId: "x", labelRef: l.labelRef, kind: "pickup", window: { from: "2026-11-02T10:00:00Z", to: "2026-11-02T12:00:00Z" } });
    expect((await c.track(l.trackingRef)).status).toBe("appointment_booked");
    t = new Date("2026-11-02T11:00:00Z").getTime();
    expect((await c.track(l.trackingRef)).status).toBe("in_transit");
    t = new Date("2026-11-04T11:00:00Z").getTime();
    expect((await c.track(l.trackingRef)).status).toBe("delivered");
  });
});
