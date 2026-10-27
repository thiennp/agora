import type { EvidenceBundle } from "../core/evidence-bundle";

export const REPORT_REASONS = ["scam", "contact_harvesting", "off_platform_payment", "abusive", "no_show", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface Report {
  id: string;
  dealId: string;
  appId: string;
  reporterFamilyId: string;
  reportedFamilyId: string;
  reason: ReportReason;
  note?: string;
  bundle: EvidenceBundle;
  signals: { id: string; weight: number }[];
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
  exportedAt?: string;
}

export function createReportStore() {
  const rows = new Map<string, Report>();
  return { rows, forDeal: (dealId: string) => [...rows.values()].filter((r) => r.dealId === dealId) };
}
export type ReportStore = ReturnType<typeof createReportStore>;
