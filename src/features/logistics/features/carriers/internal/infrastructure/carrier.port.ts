export type ShipmentStatus = "label_created" | "appointment_booked" | "in_transit" | "delivered";

export interface LabelRequest {
  shipmentId: string;
  /** The sender's coarse district only: the carrier does not need their home place. */
  fromDistrict: string;
  /** The recipient's exact address. It goes to the carrier adapter and onto the sender's label, nowhere else. */
  toAddress: string;
  toDistrict: string;
  description: string;
}

export interface Label {
  labelRef: string;
  trackingRef: string;
  /** What the sender receives to print (text here; a PDF for a real carrier). */
  labelText: string;
  /** Always zero: the platform never pays or collects money. */
  costCents: 0;
  mode: "simulated" | "test";
}

export interface AppointmentRequest {
  shipmentId: string;
  labelRef: string;
  kind: "pickup" | "dropoff";
  window: { from: string; to: string };
}

export interface Appointment {
  appointmentId: string;
  kind: "pickup" | "dropoff";
  window: { from: string; to: string };
  /** A public drop-off point name for dropoff, or "at the sender's door" for pickup. */
  where: string;
}

export interface TrackResult {
  status: ShipmentStatus;
  at: string;
}

/** The only thing shipping depends on (LOG-CAR-01). Implementations must pass the same contract suite (LOG-CAR-04). */
export interface CarrierPort {
  readonly name: string;
  createLabel(req: LabelRequest): Promise<Label>;
  bookAppointment(req: AppointmentRequest): Promise<Appointment>;
  track(trackingRef: string): Promise<TrackResult>;
}
