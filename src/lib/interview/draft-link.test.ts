import { describe, expect, it } from "vitest";
import { agentBrief, answersFromQuery, buildDraftLink, encodeAnswer, MAX_DRAFT_CHARS } from "./index";

/** What the page sees: the link is decoded once by the URL parser, as Next does for `searchParams`. */
const viaUrl = (link: string) => Object.fromEntries(new URL(link).searchParams);

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

describe("URL encoding of answers", () => {
  const words = ["Kids' clothes & toys", "Is it free? #1 plan", "Café ñandú, über 日本", "a ~ b ~ c", "100% fun; (really) *yes*!"];
  it("round-trips apostrophes, ampersands, question marks, hashes, accents and a typed tilde", () => {
    for (const w of words) {
      const link = buildDraftLink("https://example.test/agora", ["exchange", w, "How it works", "none", "Swap Club", "friendly"]);
      expect(link).not.toMatch(/[ '&?#](?!.*$)/);
      const r = answersFromQuery(viaUrl(link));
      expect(r.problem).toBeUndefined();
      expect(r.answers).toHaveLength(6);
      expect(r.answers[1]).toEqual({ step: "actions", text: w.replace(/~/g, " ").replace(/\s+/g, " ") });
    }
  });
  it("encodes each special character the way the brief says", () => {
    expect(encodeAnswer("a b,c'd&e?f#g")).toBe("a%20b%2Cc%27d%26e%3Ff%23g");
    expect(encodeAnswer("é")).toBe("%C3%A9");
    expect(encodeAnswer("a~b")).toBe("a%20b");
  });
  it("tolerates a double-encoded answer and a stray percent sign without throwing", () => {
    const twice = answersFromQuery(viaUrl("https://example.test/start?draft=exchange~Kids%2527%2520clothes~How~none"));
    expect(twice.answers[1]).toEqual({ step: "actions", text: "Kids' clothes" });
    const stray = answersFromQuery({ draft: "exchange~100%~How~none" });
    expect(stray.answers[1]).toEqual({ step: "actions", text: "100%" });
    expect(() => answersFromQuery({ draft: "exchange~%E0%A4%A~How" })).not.toThrow();
  });
  it("opens an existing link with its own words for care and keeps them", () => {
    const old = "organise~See%20when%20the%20walk%20is%20and%20say%20if%20you%20are%20coming~I%20put%20up%20the%20walk%20each%20week%20and%20people%20say%20yes%20or%20no%2C%20then%20everyone%20gets%20a%20reminder~No%20sharing%20of%20phone%20numbers~Easy%20Steps%20Walkers~friendly";
    const r = answersFromQuery(viaUrl(`https://example.test/start?draft=${old}`));
    expect(r.problem).toBeUndefined();
    expect(r.answers).toHaveLength(6);
    expect(r.answers[3]).toEqual({ step: "care", text: "No sharing of phone numbers" });
    expect(r.answers[0]).toEqual({ step: "purpose", choice: "organise" });
  });
});

describe("agent brief", () => {
  const md = agentBrief("https://example.test/agora");
  it("states the task, the questions and the final step", () => {
    expect(md).toContain("You are Muse");
    expect(md).toContain("one plain question at a time");
    expect(md).toContain("Do not go on until they agree");
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
  it("carries the rules the simulated test found missing", () => {
    expect(md).toContain("1=`exchange`");
    expect(md).toContain("never the number");
    expect(md).not.toContain("tap value");
    expect(md).toContain("A correction replaces the earlier answer");
    expect(md).toMatch(/not sure.*default/);
    expect(md).toContain("looks good");
    for (const enc of ["%20", "%2C", "%27", "%26", "%3F", "%23", "tilde", "UTF-8"]) expect(md).toContain(enc);
    expect(md).toContain("shorten it yourself");
    expect(md.indexOf("safety promise")).toBeGreaterThan(-1);
    expect(md).toMatch(/after question 3 and before question 4/);
    expect(md).toContain("**Build it** button");
    expect(md).toContain("what will the app do for me");
    expect(md).toContain("Other web requests are optional");
    expect(md).not.toContain("If you can make web requests");
    expect(md).toContain("What would you like your app to help people do together?");
  });
  it("lists exactly the six questions, each naming the app", () => {
    expect((md.match(/^\d\. \*\*.*`\w+`$/gm) ?? []).length).toBe(6);
    for (const line of md.split("\n").filter((l) => /^\d\. \*\*.*`\w+`$/.test(l))) expect(line).toMatch(/\bapp\b/i);
  });
  it("is short enough for a phone assistant", () => expect(md.length).toBeLessThan(8500));
});
