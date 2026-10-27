import { describe, expect, it } from "vitest";
import { buildEvidenceBundle } from "../features/reports/public-api/infrastructure";
import { createTrust, TrustError, type ScreeningAudit } from "./infrastructure";

const SECRET = "test-secret-0123456789";
const evidence = [{ messageHash: "a".repeat(64), at: "2026-10-27T12:00:00.000Z", role: "reported" as const, flags: ["payment"] }];

function setup() {
  const audit: ScreeningAudit[] = [];
  return { audit, trust: createTrust({ app: { id: "kids-gear" }, exportSecret: SECRET, audit: (e) => audit.push(e), now: () => new Date("2026-10-27T12:00:00Z"), newId: (() => { let n = 0; return () => `r${++n}`; })() }) };
}

describe("trust facade", () => {
  it("logs every screening decision by kind and never by text (TRU-01)", () => {
    const { trust, audit } = setup();
    trust.screen("call me on 0170 1234567", { familyId: "f1", dealId: "d1" });
    expect(audit).toEqual([{ kind: "screening", familyId: "f1", dealId: "d1", decision: "redact", kinds: ["phone"], at: "2026-10-27T12:00:00.000Z" }]);
    expect(JSON.stringify(audit)).not.toMatch(/0170/);
  });

  it("files a report with an evidence bundle, lowers the reported score, and refuses duplicates (TRU-RPT-01, 02)", () => {
    const { trust } = setup();
    const r = trust.fileReport({ dealId: "d1", reporterFamilyId: "me", reportedFamilyId: "them", reason: "scam", evidence });
    expect(r.bundle.count).toBe(1);
    expect(trust.reputation.status("them").score).toBe(65);
    expect(() => trust.fileReport({ dealId: "d1", reporterFamilyId: "me", reportedFamilyId: "them", reason: "scam", evidence })).toThrow(TrustError);
    expect(() => trust.fileReport({ dealId: "d2", reporterFamilyId: "me", reportedFamilyId: "them", reason: "boring", evidence })).toThrow(/unknown report reason/);
  });

  it("hides the reporter from the reported party and exports pseudonyms only (TRU-RPT-04)", () => {
    const { trust } = setup();
    const r = trust.fileReport({ dealId: "d1", reporterFamilyId: "reporter-fam", reportedFamilyId: "reported-fam", reason: "off_platform_payment", note: "asked for PayPal", evidence });
    expect(trust.reportsAbout("reported-fam")).toEqual([{ status: "open" }]);
    expect(() => trust.reportForReporter(r.id, "reported-fam")).toThrow(TrustError);
    expect(trust.reportForReporter(r.id, "reporter-fam").id).toBe(r.id);
    const out = trust.exportReport(r.id);
    const text = JSON.stringify(out);
    expect(text).not.toMatch(/reporter-fam|reported-fam|asked for PayPal/);
    expect(out).toMatchObject({ format: "agora.report.v1", designedFor: "Meta", reason: "off_platform_payment" });
    expect(out.reportedAgent).toMatch(/^agt_[0-9a-f]{24}$/);
    expect(out.reporter).toMatch(/^rep_[0-9a-f]{24}$/);
    expect(out.disclaimer).toMatch(/not confirmed/);
    expect(out.evidence.headHash).toBe(buildEvidenceBundle(evidence).headHash);
  });

  it("uses a different reporter pseudonym per report and a stable agent pseudonym", () => {
    const { trust } = setup();
    const a = trust.exportReport(trust.fileReport({ dealId: "d1", reporterFamilyId: "me", reportedFamilyId: "them", reason: "scam", evidence }).id);
    const b = trust.exportReport(trust.fileReport({ dealId: "d2", reporterFamilyId: "me", reportedFamilyId: "them", reason: "scam", evidence }).id);
    expect(a.reporter).not.toBe(b.reporter);
    expect(a.reportedAgent).toBe(b.reportedAgent);
  });

  it("refuses to run without a real export secret", () => {
    expect(() => createTrust({ app: { id: "x" }, exportSecret: "short" })).toThrow();
  });
});
