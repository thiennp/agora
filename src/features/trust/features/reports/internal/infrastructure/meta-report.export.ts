import { hmacHex } from "@/lib/crypto";
import type { Report } from "./report.repository";

/**
 * Export format `agora.report.v1`, documented in docs/PROTOCOL.md. It is a format designed for Meta; nothing here
 * claims Meta consumes or acts on it (TRU-RPT-03, TRU-05). People appear only as keyed pseudonyms.
 */
export interface MetaReportV1 {
  format: "agora.report.v1";
  designedFor: "Meta";
  disclaimer: "Format only. Delivery to or action by Meta is not confirmed.";
  reportId: string;
  createdAt: string;
  app: string;
  reason: string;
  reportedAgent: string;
  reporter: string;
  signals: { id: string; weight: number }[];
  evidence: { headHash: string; count: number; entries: { index: number; messageHash: string; at: string; role: string; flags: string[]; prevHash: string; hash: string }[] };
}

export function exportForMeta(r: Report, secret: string): MetaReportV1 {
  return {
    format: "agora.report.v1",
    designedFor: "Meta",
    disclaimer: "Format only. Delivery to or action by Meta is not confirmed.",
    reportId: r.id,
    createdAt: r.createdAt,
    app: r.appId,
    reason: r.reason,
    reportedAgent: `agt_${hmacHex(secret, `agent:${r.reportedFamilyId}`).slice(0, 24)}`,
    // Per-report pseudonym: not linkable across reports, and never the reporter's family id.
    reporter: `rep_${hmacHex(secret, `reporter:${r.id}:${r.reporterFamilyId}`).slice(0, 24)}`,
    signals: r.signals,
    evidence: { headHash: r.bundle.headHash, count: r.bundle.count, entries: r.bundle.entries.map(({ index, messageHash, at, role, flags, prevHash, hash }) => ({ index, messageHash, at, role, flags, prevHash, hash })) },
  };
}
