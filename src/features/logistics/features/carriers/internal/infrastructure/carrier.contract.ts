import { describe, expect, it } from "vitest";
import type { CarrierPort } from "./carrier.port";

/** Contract every carrier implementation must pass (LOG-CAR-04). */
export function runCarrierContract(name: string, make: () => { carrier: CarrierPort; advance: (hours: number) => void }) {
  describe(`carrier contract: ${name}`, () => {
    const req = { shipmentId: "s1", fromDistrict: "n:mitte", toAddress: "Example Street 1, 10115 Berlin", toDistrict: "n:pankow", description: "Winter jacket" };
    const window = { from: "2026-11-02T10:00:00.000Z", to: "2026-11-02T12:00:00.000Z" };

    it("creates a label that costs nothing and is clearly marked as test or simulated", async () => {
      const { carrier } = make();
      const l = await carrier.createLabel(req);
      expect(l.costCents).toBe(0);
      expect(["simulated", "test"]).toContain(l.mode);
      expect(l.labelRef).toBeTruthy();
      expect(l.trackingRef).toBeTruthy();
      expect(l.labelText).toMatch(/SIMULATED|TEST/);
      expect(l.labelText).toContain(req.toAddress);
    });

    it("books an appointment for a known label only", async () => {
      const { carrier } = make();
      const l = await carrier.createLabel(req);
      const a = await carrier.bookAppointment({ shipmentId: "s1", labelRef: l.labelRef, kind: "dropoff", window });
      expect(a).toMatchObject({ kind: "dropoff", window });
      expect(a.appointmentId).toBeTruthy();
      await expect(carrier.bookAppointment({ shipmentId: "s1", labelRef: "nope", kind: "dropoff", window })).rejects.toThrow();
      await expect(carrier.bookAppointment({ shipmentId: "s1", labelRef: l.labelRef, kind: "pickup", window: { from: window.to, to: window.from } })).rejects.toThrow();
    });

    it("tracks a shipment through its statuses and rejects unknown references", async () => {
      const { carrier, advance } = make();
      const l = await carrier.createLabel(req);
      expect((await carrier.track(l.trackingRef)).status).toBe("label_created");
      await carrier.bookAppointment({ shipmentId: "s1", labelRef: l.labelRef, kind: "dropoff", window });
      expect((await carrier.track(l.trackingRef)).status).toBe("appointment_booked");
      advance(72);
      expect(["in_transit", "delivered"]).toContain((await carrier.track(l.trackingRef)).status);
      advance(200);
      expect((await carrier.track(l.trackingRef)).status).toBe("delivered");
      await expect(carrier.track("unknown")).rejects.toThrow();
    });

    it("is deterministic for the same shipment", async () => {
      const a = await make().carrier.createLabel(req);
      const b = await make().carrier.createLabel(req);
      expect(a.labelRef).toBe(b.labelRef);
    });
  });
}
