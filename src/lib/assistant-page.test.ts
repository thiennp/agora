import { describe, expect, it } from "vitest";
import { agentBrief } from "./interview";
import { appAgentBrief } from "./app-config";
import { COPY_PAGE_RULES, escapeHtml, openPageHtml } from "./assistant-page";

describe("the copyable page for an assistant that cannot send requests", () => {
  const page = openPageHtml({ action: "https://x.test/start", fields: [["name", 'A "b" & <c>']], intro: "Hi", button: "Go" });
  it("is a complete script-free document with a GET form, a link and the written address", () => {
    expect(page.startsWith("<!doctype html>")).toBe(true);
    expect(page).toContain('<form method="GET" action="https://x.test/start">');
    expect(page).toContain('type="submit"');
    expect(page).toContain('<a href="https://x.test/start?name=A%20%22b%22%20%26%20%3Cc%3E" target="_blank"');
    expect(page).toContain("Or copy this address");
    expect(page).not.toMatch(/<script|onclick|target="_blank">?\s*<\/form>/i);
    expect(page.split("<form")[1]!.split("</form>")[0]!).not.toContain("target=");
  });
  it("escapes values in the markup", () => {
    expect(page).toContain('value="A &quot;b&quot; &amp; &lt;c&gt;"');
    expect(escapeHtml("<&>")).toBe("&lt;&amp;&gt;");
  });
  it("has no query when there are no fields", () => {
    expect(openPageHtml({ action: "https://x.test/app/a", fields: [], intro: "i", button: "b" })).toContain('<a href="https://x.test/app/a" ');
  });
  it("is in the create brief with one hidden field per step, and in the join brief for the app", () => {
    const create = agentBrief("https://example.test/agora");
    for (const s of ["purpose", "actions", "how", "care", "name", "feel"]) expect(create).toContain(`<input type="hidden" name="${s}" value="YOUR-ANSWER">`);
    expect(create).toContain(COPY_PAGE_RULES);
    const join = appAgentBrief(
      { id: "walkers", name: "Easy <Walkers>", region: "Anywhere", participant: "person", languages: [] },
      { purpose: "p", features: ["f"], limits: ["l"], rules: ["r"] } as never,
      "https://example.test/agora",
    );
    expect(join).toContain('<form method="GET" action="https://example.test/agora/app/walkers">');
    expect(join).toContain("Open Easy &lt;Walkers&gt;");
    expect(join).toContain(COPY_PAGE_RULES);
  });
});
