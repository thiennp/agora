import type { AppConfig } from "@/lib/app-config";
import { buildEvidenceBundle, createReportStore, exportForMeta, REPORT_REASONS } from "../features/reports/public-api/infrastructure";
import type { EvidenceInput, Report, ReportReason, ReportStore } from "../features/reports/public-api/types";
import { createReputation, indicatorFor } from "../features/reputation/public-api/infrastructure";
import type { Indicator } from "../features/reputation/public-api/types";
import { scoreSignals } from "../features/scam-signals/public-api/infrastructure";
import type { SignalInput } from "../features/scam-signals/public-api/types";
import { screen } from "../features/screening/public-api/infrastructure";
import type { ScreeningOptions } from "../features/screening/public-api/types";

export { screen } from "../features/screening/public-api/infrastructure";
export { scoreSignals } from "../features/scam-signals/public-api/infrastructure";
export { verifyEvidenceBundle } from "../features/reports/public-api/infrastructure";

export class TrustError extends Error {
  constructor(readonly code: "duplicate_report" | "bad_reason" | "not_found" | "not_reporter", message: string) {
    super(message);
  }
}

export interface ScreeningAudit {
  kind: "screening";
  familyId: string;
  dealId?: string;
  decision: "allow" | "redact" | "block";
  kinds: string[];
  at: string;
}

/**
 * Trust facade: screening, scam signals, reputation and reports. Screening decisions are logged by kind, never by text
 * (TRU-01). A reported party can learn only that a report exists, never who made it (TRU-RPT-04).
 */
export function createTrust(deps: {
  app: Pick<AppConfig, "id">;
  /** Secret for pseudonyms in exports. Required: a missing secret would make pseudonyms guessable. */
  exportSecret: string;
  reports?: ReportStore;
  audit?: (entry: ScreeningAudit) => void;
  now?: () => Date;
  newId?: () => string;
}) {
  if (!deps.exportSecret || deps.exportSecret.length < 16) throw new Error("trust needs an export secret of at least 16 characters");
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const store = deps.reports ?? createReportStore();
  const reputation = createReputation({ now });

  return {
    reputation,
    /** Screen one message and log the decision. */
    screen(text: string, ctx?: { familyId: string; dealId?: string }, opts?: ScreeningOptions) {
      const r = screen(text, opts);
      if (ctx) deps.audit?.({ kind: "screening", familyId: ctx.familyId, dealId: ctx.dealId, decision: r.decision, kinds: r.kinds, at: now().toISOString() });
      return r;
    },
    signals: (input: SignalInput) => scoreSignals(input),
    /** Simple owner-facing level for an agent. */
    indicator: (familyId: string): Indicator => indicatorFor(reputation.status(familyId)),

    /** File a report (two taps: deal and reason). Keeps an evidence bundle and lowers the reported agent's score. */
    fileReport(input: { dealId: string; reporterFamilyId: string; reportedFamilyId: string; reason: string; note?: string; evidence: EvidenceInput[]; signals?: { id: string; weight: number }[] }): Report {
      if (!REPORT_REASONS.includes(input.reason as ReportReason)) throw new TrustError("bad_reason", "unknown report reason");
      if (store.forDeal(input.dealId).some((r) => r.reporterFamilyId === input.reporterFamilyId)) {
        throw new TrustError("duplicate_report", "you already reported this deal");
      }
      const report: Report = {
        id: newId(), dealId: input.dealId, appId: deps.app.id, reporterFamilyId: input.reporterFamilyId, reportedFamilyId: input.reportedFamilyId,
        reason: input.reason as ReportReason, note: input.note?.slice(0, 500), bundle: buildEvidenceBundle(input.evidence), signals: input.signals ?? [],
        status: "open", createdAt: now().toISOString(),
      };
      store.rows.set(report.id, report);
      reputation.record(input.reportedFamilyId, { type: "report_filed_against" });
      return report;
    },
    /** What the reporter sees of their own report. */
    reportForReporter(id: string, familyId: string): Report {
      const r = store.rows.get(id);
      if (!r) throw new TrustError("not_found", "report not found");
      if (r.reporterFamilyId !== familyId) throw new TrustError("not_reporter", "not your report");
      return structuredClone(r);
    },
    /** All the reported party may learn: a report exists and its status. No reporter, no evidence, no reason. */
    reportsAbout(reportedFamilyId: string): { status: Report["status"] }[] {
      return [...store.rows.values()].filter((r) => r.reportedFamilyId === reportedFamilyId).map((r) => ({ status: r.status }));
    },
    /** Export in the documented format; marks it exported. Operator use only. */
    exportReport(id: string) {
      const r = store.rows.get(id);
      if (!r) throw new TrustError("not_found", "report not found");
      r.exportedAt = now().toISOString();
      return exportForMeta(r, deps.exportSecret);
    },
    eraseFamily(familyId: string) {
      reputation.erase(familyId);
    },
  };
}

export type Trust = ReturnType<typeof createTrust>;
