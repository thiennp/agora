import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migrations", () => {
  it("are numbered 0001.. without gaps or duplicates, and none is empty", () => {
    const files = readdirSync("db/migrations").filter((n) => n.endsWith(".sql")).sort();
    expect(files.length).toBeGreaterThan(0);
    files.forEach((f, i) => {
      expect(f.slice(0, 4), `${f} should be migration ${String(i + 1).padStart(4, "0")}`).toBe(String(i + 1).padStart(4, "0"));
      expect(readFileSync(`db/migrations/${f}`, "utf8").trim().length, `${f} is empty`).toBeGreaterThan(0);
    });
  });

  it("only handoffs hold an exact address or coordinates (FAM-02)", () => {
    const risky = /\b(address|street|latitude|longitude|lat|lng|lon)\b/i;
    for (const f of readdirSync("db/migrations").filter((n) => n.endsWith(".sql") && !n.includes("logistics"))) {
      const sql = readFileSync(`db/migrations/${f}`, "utf8").replace(/--.*$/gm, "");
      expect(sql, f).not.toMatch(risky);
    }
  });

  it("holds no health, sleep or feeding columns (FAM-05)", () => {
    for (const f of readdirSync("db/migrations").filter((n) => n.endsWith(".sql"))) {
      const sql = readFileSync(`db/migrations/${f}`, "utf8").replace(/--.*$/gm, "");
      expect(sql, f).not.toMatch(/\b(health|sleep|feeding|diagnosis|medical)\b/i);
    }
  });

  it("has unique, gap-free numbering and no empty files (DB-01)", () => {
    const files = readdirSync("db/migrations").filter((n) => n.endsWith(".sql")).sort();
    files.forEach((f, i) => {
      expect(f.startsWith(String(i + 1).padStart(4, "0") + "_"), f).toBe(true);
      expect(readFileSync(`db/migrations/${f}`, "utf8").trim().length, f).toBeGreaterThan(0);
    });
  });
});
