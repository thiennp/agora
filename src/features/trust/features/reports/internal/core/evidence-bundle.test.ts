import { describe, expect, it } from "vitest";
import { buildEvidenceBundle, verifyEvidenceBundle, type EvidenceInput } from "./evidence-bundle";

const input = (i: number, flags: string[] = []): EvidenceInput => ({ messageHash: `h${i}`.padEnd(64, "0"), at: `2026-10-27T12:0${i}:00.000Z`, role: i % 2 ? "reporter" : "reported", flags });

describe("evidence bundle", () => {
  it("chains entries in time order and verifies", () => {
    const b = buildEvidenceBundle([input(2), input(0), input(1, ["payment"])]);
    expect(b.entries.map((e) => e.index)).toEqual([0, 1, 2]);
    expect(b.entries[0]!.prevHash).toBe("0".repeat(64));
    expect(b.entries[1]!.prevHash).toBe(b.entries[0]!.hash);
    expect(verifyEvidenceBundle(b)).toBe(true);
  });

  it("detects any edit, removal, reorder or head change (TRU-RPT-02)", () => {
    const make = () => buildEvidenceBundle([input(0), input(1), input(2)]);
    const edited = make(); edited.entries[1]!.flags = ["forged"]; expect(verifyEvidenceBundle(edited)).toBe(false);
    const removed = make(); removed.entries.splice(1, 1); removed.count = 2; expect(verifyEvidenceBundle(removed)).toBe(false);
    const swapped = make(); [swapped.entries[0], swapped.entries[1]] = [swapped.entries[1]!, swapped.entries[0]!]; expect(verifyEvidenceBundle(swapped)).toBe(false);
    const head = make(); head.headHash = "f".repeat(64); expect(verifyEvidenceBundle(head)).toBe(false);
    expect(verifyEvidenceBundle(buildEvidenceBundle([]))).toBe(true);
  });
});
