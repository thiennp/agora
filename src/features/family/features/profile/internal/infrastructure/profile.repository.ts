export interface FamilyRecord {
  id: string;
  appId: string;
  language: string;
  districtCode: string;
  profile: Record<string, string | number>;
  memoryRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileRepository {
  insert(record: FamilyRecord): Promise<void>;
  get(id: string): Promise<FamilyRecord | null>;
  update(record: FamilyRecord): Promise<void>;
  /** Removes the family and every dependent row (FAM-03). */
  remove(id: string): Promise<boolean>;
  listByApp(appId: string): Promise<FamilyRecord[]>;
}

/** Default store for mock mode and tests. A Postgres implementation replaces it once lib/db exists. */
export function createInMemoryProfileRepository(): ProfileRepository {
  const rows = new Map<string, FamilyRecord>();
  return {
    async insert(r) {
      rows.set(r.id, structuredClone(r));
    },
    async get(id) {
      const r = rows.get(id);
      return r ? structuredClone(r) : null;
    },
    async update(r) {
      if (!rows.has(r.id)) throw new Error("family not found");
      rows.set(r.id, structuredClone(r));
    },
    async remove(id) {
      return rows.delete(id);
    },
    async listByApp(appId) {
      return [...rows.values()].filter((r) => r.appId === appId).map((r) => structuredClone(r));
    },
  };
}
