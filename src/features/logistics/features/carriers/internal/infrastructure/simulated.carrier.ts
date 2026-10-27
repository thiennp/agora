import { sha256Hex } from "@/lib/crypto";
import type { Appointment, AppointmentRequest, CarrierPort, Label, LabelRequest, TrackResult } from "./carrier.port";

export const WATERMARK = "SIMULATED TEST LABEL - NOT VALID FOR SHIPPING - NO COST";

/**
 * Default carrier in every environment (LOG-CAR-02). Deterministic, free, and every label is watermarked. Tracking is driven by
 * the clock: booked until the appointment starts, in transit for 48 hours after, then delivered.
 */
export function createSimulatedCarrier(deps: { now?: () => Date } = {}): CarrierPort {
  const now = deps.now ?? (() => new Date());
  const appointments = new Map<string, { start: number; kind: "pickup" | "dropoff" }>();
  const labelByRef = new Map<string, string>();

  return {
    name: "simulated",
    async createLabel(req: LabelRequest): Promise<Label> {
      const id = sha256Hex(`label|${req.shipmentId}`).slice(0, 12).toUpperCase();
      const labelRef = `SIM-${id}`;
      const trackingRef = `SIMTRK${id}`;
      labelByRef.set(labelRef, trackingRef);
      const labelText = [WATERMARK, `Label ${labelRef}`, `Tracking ${trackingRef}`, `From district: ${req.fromDistrict}`, `To: ${req.toAddress}`, `Contents: ${req.description}`, WATERMARK].join("\n");
      return { labelRef, trackingRef, labelText, costCents: 0, mode: "simulated" };
    },
    async bookAppointment(req: AppointmentRequest): Promise<Appointment> {
      const tracking = labelByRef.get(req.labelRef);
      if (!tracking) throw new Error("unknown label");
      if (new Date(req.window.from) >= new Date(req.window.to)) throw new Error("appointment window must end after it starts");
      appointments.set(tracking, { start: new Date(req.window.from).getTime(), kind: req.kind });
      return {
        appointmentId: `SIMAPT-${sha256Hex(`apt|${req.shipmentId}|${req.window.from}`).slice(0, 10).toUpperCase()}`,
        kind: req.kind,
        window: req.window,
        where: req.kind === "pickup" ? "at the sender's door (simulated)" : "Simulated Parcel Point",
      };
    },
    async track(trackingRef: string): Promise<TrackResult> {
      const at = now().toISOString();
      const a = appointments.get(trackingRef);
      if (![...labelByRef.values()].includes(trackingRef)) throw new Error("unknown tracking reference");
      if (!a) return { status: "label_created", at };
      const t = now().getTime();
      if (t < a.start) return { status: "appointment_booked", at };
      return { status: t < a.start + 48 * 3_600_000 ? "in_transit" : "delivered", at };
    },
  };
}

/** Public drop points near a district for locker and shop handovers. Simulated: real carriers list real ones. */
export function simulatedDropPoints(districtCode: string): { id: string; name: string; kind: "locker" | "shop" }[] {
  return [
    { id: `${districtCode}:locker-1`, name: "Simulated Parcel Locker", kind: "locker" },
    { id: `${districtCode}:shop-1`, name: "Simulated Corner Shop", kind: "shop" },
  ];
}
