import type { RelayMessage } from "../core/relay-message.schema";

export function createRelayStore() {
  const rows: RelayMessage[] = [];
  return {
    rows,
    forDeal: (dealId: string) => rows.filter((m) => m.dealId === dealId),
    fromInLastHour: (dealId: string, familyId: string, now: Date) =>
      rows.filter((m) => m.dealId === dealId && m.fromFamilyId === familyId && now.getTime() - new Date(m.at).getTime() < 3_600_000).length,
    removeFamily(familyId: string) {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.fromFamilyId === familyId || rows[i]!.toFamilyId === familyId) rows.splice(i, 1);
    },
  };
}
export type RelayStore = ReturnType<typeof createRelayStore>;
