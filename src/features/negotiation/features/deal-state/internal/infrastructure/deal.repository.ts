import type { Deal } from "../core/deal-state-machine";
import { tracked } from "@/lib/state";

export interface DealRepository {
  insert(deal: Deal): Promise<void>;
  get(id: string): Promise<Deal | null>;
  save(deal: Deal): Promise<void>;
  listForFamily(familyId: string): Promise<Deal[]>;
  listOpen(): Promise<Deal[]>;
}

export function createInMemoryDealRepository(): DealRepository {
  const rows = tracked("negotiation.deals", new Map<string, Deal>());
  const copy = (d: Deal) => structuredClone(d);
  return {
    async insert(d) {
      rows.set(d.id, copy(d));
    },
    async get(id) {
      const d = rows.get(id);
      return d ? copy(d) : null;
    },
    async save(d) {
      if (!rows.has(d.id)) throw new Error("deal not found");
      rows.set(d.id, copy(d));
    },
    async listForFamily(f) {
      return [...rows.values()].filter((d) => d.offerFamilyId === f || d.wantFamilyId === f).map(copy);
    },
    async listOpen() {
      return [...rows.values()].filter((d) => !["declined", "expired", "reported", "completed", "not_completed", "confirmed", "handoff"].includes(d.state)).map(copy);
    },
  };
}
