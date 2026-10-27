import { describe, expect, it } from "vitest";
import { bothConfirmed } from "./both-confirmed";

describe("bothConfirmed", () => {
  it("needs a confirmed card from each owner", () => {
    const o: [string, string] = ["a", "b"];
    expect(bothConfirmed([], o)).toBe(false);
    expect(bothConfirmed([{ familyId: "a", status: "confirmed" }], o)).toBe(false);
    expect(bothConfirmed([{ familyId: "a", status: "confirmed" }, { familyId: "b", status: "declined" }], o)).toBe(false);
    expect(bothConfirmed([{ familyId: "a", status: "confirmed" }, { familyId: "b", status: "confirmed" }], o)).toBe(true);
  });
});
