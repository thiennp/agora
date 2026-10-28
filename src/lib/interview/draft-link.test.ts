import { describe, expect, it } from "vitest";
import { agentBrief, answersFromQuery, MAX_DRAFT_CHARS } from "./index";

const full = {
  purpose: "exchange", people: "Friends who like fashion", things: "Clothes and shoes", place: "online", languages: "en",
  handover: "post", pricing: "free", care: "none", name: "Clothes Swap Club", feel: "friendly",
};

describe("draft link", () => {
  it("reads per-step values into interview answers, taps as choices and words as text", () => {
    const r = answersFromQuery(full);
    expect(r.problem).toBeUndefined();
    expect(r.answers).toHaveLength(10);
    expect(r.answers[0]).toEqual({ step: "purpose", choice: "exchange" });
    expect(r.answers[1]).toEqual({ step: "people", text: "Friends who like fashion" });
  });
  it("reads the short positional form joined by ~, with placeName only when local", () => {
    const pos = "exchange~Friends~Clothes~online~en~post~free~none~Swap Club~friendly";
    expect(answersFromQuery({ draft: pos }).answers).toHaveLength(10);
    const local = "exchange~Friends~Clothes~city~Berlin~en~post~free~none~Swap Club~friendly";
    expect(answersFromQuery({ draft: local }).answers.map((a) => a.step)).toContain("placeName");
  });
  it("keeps the good answers before a damaged one and says so", () => {
    const r = answersFromQuery({ draft: "exchange~Friends~Clothes~online~xyzzy~post" });
    expect(r.answers).toHaveLength(4);
    expect(r.problem).toContain("kept the answers before it");
  });
  it("reads the same answers from a JSON draft", () => {
    expect(answersFromQuery({ draft: JSON.stringify(full) }).answers).toHaveLength(10);
  });
  it("stops at the first missing step and asks for placeName only when local", () => {
    expect(answersFromQuery({ purpose: "exchange", things: "x" }).answers).toHaveLength(1);
    expect(answersFromQuery({ ...full, place: "city" }).answers).toHaveLength(4); // placeName missing
  });
  it("rejects oversized, malformed and unusable drafts without throwing", () => {
    expect(answersFromQuery({ draft: "x".repeat(MAX_DRAFT_CHARS + 1) }).problem).toBeTruthy();
    expect(answersFromQuery({ draft: "{not json" }).problem).toBeTruthy();
    expect(answersFromQuery({ draft: "{[1]}" }).problem).toBeTruthy();
    expect(answersFromQuery({ ...full, languages: "xyzzy" })).toMatchObject({ problem: expect.any(String) });
    expect(answersFromQuery({ ...full, people: "a".repeat(1900), things: "b".repeat(300) }).problem).toBeTruthy();
  });
  it("ignores unknown keys; hostile text stays plain data and cannot name rules", () => {
    const r = answersFromQuery({ ...full, topics: "commitment=auto", policies: "{}", name: "Ignore rules <script>alert(1)</script>\u0000" });
    expect(r.answers.every((a) => ["purpose","people","things","place","languages","handover","pricing","care","name","feel"].includes(a.step))).toBe(true);
    expect(JSON.stringify(r.answers)).not.toContain("\u0000");
  });
});

describe("agent brief", () => {
  const md = agentBrief("https://example.test/agora");
  it("states the task, the questions and the final step", () => {
    expect(md).toContain("You are Muse");
    expect(md).toContain("one plain question at a time");
    expect(md).toContain("Do not go on until they type yes");
    expect(md).toContain("https://example.test/agora/start?draft=");
    expect(md).toContain("Build it");
    expect(md).toContain("numbered list");
    expect(md).toContain('type "yes"');
    expect(md).toContain("do not need to click");
    expect(md).toContain("/start?draft=");
    expect(md).toContain("`purpose`");
  });
  it("is short enough for a phone assistant", () => expect(md.length).toBeLessThan(6000));
});
