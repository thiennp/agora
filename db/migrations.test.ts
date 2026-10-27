import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migrations", () => {
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
});
