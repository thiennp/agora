import { describe, expect, it } from "vitest";
import { isFaithful } from "./faithful-relay";

describe("faithful relay", () => {
  it("accepts a translation that keeps numbers and a sane length", () => {
    expect(isFaithful("Is size 68 still available on 3.11. at 15:00?", "Ist Größe 68 am 3.11. um 15:00 noch verfügbar?")).toBe(true);
  });
  it("rejects changed numbers, empty output and wild length changes", () => {
    expect(isFaithful("Size 68 please", "Größe 86 bitte")).toBe(false);
    expect(isFaithful("Is it still available for us?", "  ")).toBe(false);
    expect(isFaithful("Is it still available for us this week?", "Ja. " + "und noch viel mehr ".repeat(30))).toBe(false);
    expect(isFaithful("Hi", "Hallo zusammen")).toBe(true);
  });
});
