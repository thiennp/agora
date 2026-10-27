import { tracked } from "@/lib/state";
export interface IndexedItem {
  id: string;
  appId: string;
  familyId: string;
  kind: "offer" | "want";
  category: string;
  size?: string;
  condition?: string;
  createdAt: string;
  districtCode: string;
}

const bucketKey = (appId: string, kind: string, category: string, district: string) => `${appId}|${kind}|${category}|${district}`;

/** Buckets by app, kind, category and district so a lookup touches only nearby buckets, never the whole table (MAT-CAN-01). */
export function createCandidateIndex() {
  const buckets = tracked("matching.buckets", new Map<string, Map<string, IndexedItem>>());
  const where = tracked("matching.where", new Map<string, string>());

  return {
    add(item: IndexedItem) {
      this.remove(item.id);
      const k = bucketKey(item.appId, item.kind, item.category, item.districtCode);
      (buckets.get(k) ?? buckets.set(k, new Map()).get(k)!).set(item.id, item);
      where.set(item.id, k);
    },
    remove(id: string) {
      const k = where.get(id);
      if (!k) return;
      buckets.get(k)?.delete(id);
      where.delete(id);
    },
    query(q: { appId: string; kind: "offer" | "want"; category: string; districtKeys: string[] }): IndexedItem[] {
      return q.districtKeys.flatMap((d) => [...(buckets.get(bucketKey(q.appId, q.kind, q.category, d))?.values() ?? [])]);
    },
    clear() {
      buckets.clear();
      where.clear();
    },
    size: () => where.size,
  };
}

export type CandidateIndex = ReturnType<typeof createCandidateIndex>;
