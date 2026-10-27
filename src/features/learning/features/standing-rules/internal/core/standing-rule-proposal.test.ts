import { describe, expect, it } from "vitest";
import { proposalsFor, type Answer } from "./standing-rule-proposal";

const y = (topic: string): Answer => ({ topic, answer: "yes" });
const n = (topic: string): Answer => ({ topic, answer: "no" });
const base = { eligible: ["pickup_time_window", "size_question"], active: [], dismissed: [] };

describe("standing rule proposals", () => {
  it("proposes after three identical yes answers in a row (LRN-STR-01)", () => {
    expect(proposalsFor([y("pickup_time_window"), y("pickup_time_window")], base)).toEqual([]);
    expect(proposalsFor([y("pickup_time_window"), y("pickup_time_window"), y("pickup_time_window")], base)).toEqual([{ topic: "pickup_time_window", evidenceCount: 3 }]);
    expect(proposalsFor([y("pickup_time_window"), y("pickup_time_window"), y("pickup_time_window")], { ...base, threshold: 5 })).toEqual([]);
  });
  it("resets on a no and counts topics separately", () => {
    expect(proposalsFor([y("pickup_time_window"), y("pickup_time_window"), n("pickup_time_window"), y("pickup_time_window")], base)).toEqual([]);
    expect(proposalsFor([y("pickup_time_window"), y("size_question"), y("pickup_time_window"), y("size_question"), y("pickup_time_window")], base)).toEqual([{ topic: "pickup_time_window", evidenceCount: 3 }]);
  });
  it("never proposes always-ask topics, active rules or dismissed topics (LRN-STR-03)", () => {
    const many = (t: string) => [y(t), y(t), y(t), y(t)];
    expect(proposalsFor([...many("price_terms"), ...many("commitment"), ...many("location_reveal")], base)).toEqual([]);
    expect(proposalsFor(many("pickup_time_window"), { ...base, active: ["pickup_time_window"] })).toEqual([]);
    expect(proposalsFor(many("pickup_time_window"), { ...base, dismissed: ["pickup_time_window"] })).toEqual([]);
  });
});
