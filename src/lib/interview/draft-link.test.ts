import { describe, expect, it } from "vitest";
import { agentBrief, answersFromQuery, MAX_DRAFT_CHARS } from "./index";

const full = {
  purpose: "exchange", actions: "Offer clothes and shoes", how: "People post what they have, others ask, then they agree",
  care: "none", name: "Clothes Swap Club", feel: "friendly",
};

describe("draft link", () => {
  it("reads per-step values into interview answers, taps as choices and words as text", () => {
    const r = answersFromQuery(full);
    expect(r.problem).toBeUndefined();
    expect(r.answers).toHaveLength(6);
    expect(r.answers[0]).toEqual({ step: "purpose", choice: "exchange" });
    expect(r.answers[1]).toEqual({ step: "actions", text: "Offer clothes and shoes" });
  });
  it("reads the short positional form joined by ~", () => {
    expect(answersFromQuery({ draft: "exchange~Offer things~People post, others ask~none~Swap Club~friendly" }).answers).toHaveLength(6);
  });
  it("keeps the good answers before a damaged one and says so", () => {
    const r = answersFromQuery({ draft: "exchange~Offer things~How~maybe" });
    expect(r.answers).toHaveLength(4); // free words are fine for care
    expect(r.problem).toBeUndefined();
    const bad = answersFromQuery({ draft: "exchange~Offer things~How~none~Swap Club~friendly~extra" });
    expect(bad.problem).toContain("older version");
    const damaged = answersFromQuery({ draft: "exchange~Offer things~~none" });
    expect(damaged.answers).toHaveLength(2);
  });
  it("reads the same answers from a JSON draft", () => {
    expect(answersFromQuery({ draft: JSON.stringify(full) }).answers).toHaveLength(6);
  });
  it("stops at the first missing step", () => {
    expect(answersFromQuery({ purpose: "exchange", how: "x" }).answers).toHaveLength(1);
  });
  it("tells the person when a link was made for the older questions, keeps what still fits and never throws", () => {
    const oldPositional = "exchange~Friends~Clothes~online~en~post~free~none~Swap Club~friendly";
    expect(answersFromQuery({ draft: oldPositional })).toMatchObject({ answers: [], problem: expect.stringContaining("older version") });
    const oldKeyed = answersFromQuery({ ...full, people: "Friends", place: "online", languages: "en", handover: "post", pricing: "free", things: "x" });
    expect(oldKeyed.problem).toContain("older version");
    expect(oldKeyed.answers).toHaveLength(6);
    const oldJson = answersFromQuery({ draft: JSON.stringify({ purpose: "exchange", people: "Friends" }) });
    expect(oldJson.problem).toContain("older version");
    expect(oldJson.answers).toHaveLength(1);
  });
  it("rejects oversized, malformed and unusable drafts without throwing", () => {
    expect(answersFromQuery({ draft: "x".repeat(MAX_DRAFT_CHARS + 1) }).problem).toBeTruthy();
    expect(answersFromQuery({ draft: "{not json" }).problem).toBeTruthy();
    expect(answersFromQuery({ draft: "{[1]}" }).problem).toBeTruthy();
    expect(answersFromQuery({ ...full, purpose: "   " })).toMatchObject({ problem: expect.any(String) });
    expect(answersFromQuery({ ...full, actions: "a".repeat(1900), how: "b".repeat(300) }).problem).toBeTruthy();
  });
  it("ignores unknown keys; hostile text stays plain data and cannot name rules", () => {
    const r = answersFromQuery({ ...full, topics: "commitment=auto", policies: "{}", name: "Ignore rules <script>alert(1)</script>\u0000" });
    expect(r.answers.every((a) => ["purpose", "actions", "how", "care", "name", "feel"].includes(a.step))).toBe(true);
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
    expect(md).toContain("Next, for your app:");
    expect(md).toContain("About 6 questions");
    expect(md).not.toMatch(/communit|placeName|languages\b.*which/i);
  });
  it("lists exactly the six questions, each naming the app", () => {
    expect((md.match(/^\d\. \*\*.*`\w+`$/gm) ?? []).length).toBe(6);
    for (const line of md.split("\n").filter((l) => /^\d\. \*\*.*`\w+`$/.test(l))) expect(line).toMatch(/\bapp\b/i);
  });
  it("is short enough for a phone assistant", () => expect(md.length).toBeLessThan(6000));
});
