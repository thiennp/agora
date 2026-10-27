import { describe, expect, it } from "vitest";
import { screen } from "./screening-rules";

describe("screening", () => {
  it("redacts contact details in place and keeps the rest of the message", () => {
    const r = screen("Hi! Call me on 0170 1234567 or mail anna@example.com, thanks");
    expect(r.decision).toBe("redact");
    expect(r.redacted).toBe("Hi! Call me on [number removed] or mail [email removed], thanks");
    expect(r.reason).toMatch(/details removed/);
    expect(screen(r.redacted).decision).toBe("allow");
  });

  it("blocks addresses and payment requests outright, and tells the sender why (TRU-SCR-02)", () => {
    const a = screen("I live at 12 Oak Street");
    expect(a).toMatchObject({ decision: "block", redacted: "" });
    expect(a.reason).toMatch(/addresses can't be shared/);
    expect(screen("pay me first via PayPal").reason).toMatch(/payment requests/);
  });

  it("blocks instead of redacting when asked, and when only an obfuscated reading finds it", () => {
    expect(screen("mail anna@example.com", { contactMode: "block" }).decision).toBe("block");
    const o = screen("anna dot k at example dot com");
    expect(o.decision).toBe("block");
    expect(o.findings.every((f) => f.span === null)).toBe(true);
  });

  it("does not mistake sizes, dates, times, ages or prices for phone numbers", () => {
    for (const t of ["Size 68, 74 or 80", "on 3.11.2026 at 10:30", "2026-11-02T10:00:00Z", "12 months, 2 kg", "that's 1.250,00 euros", "order 12345"]) {
      expect(screen(t).decision, t).toBe("allow");
    }
  });

  it("is deterministic and handles empty text", () => {
    expect(screen("")).toMatchObject({ decision: "allow", redacted: "" });
    expect(screen("call 0170-123-4567")).toEqual(screen("call 0170-123-4567"));
  });

  it("merges overlapping findings into one removal", () => {
    expect(screen("see https://x.io/a?b=anna@example.com").redacted).toBe("see [link removed]");
  });
});
