import type { ItemStatus } from "../core/item.schema";

export interface SafetyFlag {
  ruleId: string;
  missing: string[];
  advice: string;
}

export interface ItemRecord {
  id: string;
  familyId: string;
  appId: string;
  kind: "offer" | "want";
  category: string;
  size?: string;
  condition?: string;
  description: string;
  attributes: Record<string, string>;
  cropUrl?: string;
  status: ItemStatus;
  safetyFlags: SafetyFlag[];
  reservedDealId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemRepository {
  insert(item: ItemRecord): Promise<void>;
  get(id: string): Promise<ItemRecord | null>;
  save(item: ItemRecord): Promise<void>;
  listByFamily(familyId: string): Promise<ItemRecord[]>;
  /** Items other families may see: status listed only. */
  listListed(appId: string): Promise<ItemRecord[]>;
  removeByFamily(familyId: string): Promise<void>;
}

export function createInMemoryItemRepository(): ItemRepository {
  const rows = new Map<string, ItemRecord>();
  const copy = <T,>(v: T): T => structuredClone(v);
  return {
    async insert(i) {
      rows.set(i.id, copy(i));
    },
    async get(id) {
      const r = rows.get(id);
      return r ? copy(r) : null;
    },
    async save(i) {
      if (!rows.has(i.id)) throw new Error("item not found");
      rows.set(i.id, copy(i));
    },
    async listByFamily(familyId) {
      return [...rows.values()].filter((r) => r.familyId === familyId).map(copy);
    },
    async listListed(appId) {
      return [...rows.values()].filter((r) => r.appId === appId && r.status === "listed").map(copy);
    },
    async removeByFamily(familyId) {
      for (const [id, r] of rows) if (r.familyId === familyId) rows.delete(id);
    },
  };
}
