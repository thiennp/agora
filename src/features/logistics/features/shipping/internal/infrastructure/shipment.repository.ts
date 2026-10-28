import type { Appointment, ShipmentStatus } from "../../../carriers/public-api/types";
import type { FeeSplit } from "../core/fee-split";
import { tracked } from "@/lib/state";

export interface Shipment {
  id: string;
  dealId: string;
  senderFamilyId: string;
  recipientFamilyId: string;
  /** Recipient's delivery address, encrypted at rest. Decrypted only to call the carrier adapter. */
  addressEnc?: string;
  carrier: string;
  mode: "simulated" | "test";
  labelRef?: string;
  trackingRef?: string;
  /** The label (it contains the recipient's address), encrypted at rest; decrypted only for the sender's view. */
  labelTextEnc?: string;
  appointment?: Appointment;
  feeSplit?: FeeSplit;
  status?: ShipmentStatus;
  createdAt: string;
}

export function createShipmentStore() {
  const rows = tracked("logistics.shipments", new Map<string, Shipment>());
  return { rows };
}
export type ShipmentStore = ReturnType<typeof createShipmentStore>;
