import { describe, expect, it } from "vitest";
import { labelBlockers, type LabelGuardInput } from "./label-guard";
import { validateFeeSplit } from "./fee-split";

const ok: LabelGuardInput = {
  dealState: "handoff", mode: "shipping", planApproved: true, approvals: ["s", "r"], owners: ["s", "r"], senderId: "s",
  actingFamilyId: "s", recipientAddressSet: true, alreadyHasLabel: false,
};

describe("label guard", () => {
  it("allows a label only when everything is in place (LOG-SHP-01)", () => {
    expect(labelBlockers(ok)).toEqual([]);
  });
  it("names every missing condition", () => {
    expect(labelBlockers({ ...ok, dealState: "awaiting_owners" })).toEqual(["both owners must confirm the deal first"]);
    expect(labelBlockers({ ...ok, mode: "pickup" })).toContain("the agreed way to hand over is not shipping");
    expect(labelBlockers({ ...ok, planApproved: false })).toContain("both owners must approve shipping");
    expect(labelBlockers({ ...ok, approvals: ["r"] })).toEqual(expect.arrayContaining(["the sender must approve shipping", "both owners must approve shipping"]));
    expect(labelBlockers({ ...ok, actingFamilyId: "r" })).toEqual(["only the sender can create the label"]);
    expect(labelBlockers({ ...ok, recipientAddressSet: false })).toEqual(["the recipient has not given a delivery address yet"]);
    expect(labelBlockers({ ...ok, alreadyHasLabel: true })).toEqual(["a label already exists"]);
  });
});

describe("fee split", () => {
  it("records only percentages that add up to 100 (LOG-SHP-03)", () => {
    expect(validateFeeSplit({ senderPct: 50, recipientPct: 50, note: "split the postage" })).toEqual({ senderPct: 50, recipientPct: 50, note: "split the postage" });
    for (const bad of [null, {}, { senderPct: 60, recipientPct: 60 }, { senderPct: 50.5, recipientPct: 49.5 }, { senderPct: -10, recipientPct: 110 }, { senderPct: "50", recipientPct: 50 }]) {
      expect(() => validateFeeSplit(bad)).toThrow();
    }
  });
});
