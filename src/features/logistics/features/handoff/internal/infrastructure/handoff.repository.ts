import type { HandoffMode, Window } from "../core/handoff-mode";
import { tracked } from "@/lib/state";

export interface Plan {
  dealId: string;
  appId: string;
  offerFamilyId: string;
  wantFamilyId: string;
  mode: HandoffMode;
  window?: Window;
  reason: string;
  /** Owners who approved the current mode. A change of mode clears this. */
  approvals: string[];
  changes: number;
  state: "proposed" | "approved" | "completed" | "not_completed";
  /** Exact meeting place for pickup, written by the host, encrypted at rest (DB-03). */
  placeEnc?: string;
  /** Public drop point for locker and shop modes. */
  dropPoint?: { id: string; name: string };
  checklist: string[];
  outcome?: { ok: boolean; reason?: string; by: string; at: string };
  createdAt: string;
}

export function createPlanStore() {
  const rows = tracked("logistics.handoffs", new Map<string, Plan>());
  return { rows };
}
export type PlanStore = ReturnType<typeof createPlanStore>;
