import { describe, expect, it } from "vitest";
import { ALWAYS_ASK_TOPICS, appConfigSchema } from "./schema";
import { loadApp } from "./load-app";

describe("app config", () => {
  it("loads and validates the kids-gear app", async () => {
    const app = await loadApp("kids-gear");
    expect(app.id).toBe("kids-gear");
  });

  it("rejects an app that relaxes an always-ask topic", async () => {
    const app = await loadApp("kids-gear");
    for (const topic of ALWAYS_ASK_TOPICS) {
      const bad = { ...app, policies: { ...app.policies, topics: { ...app.policies.topics, [topic]: "auto" } } };
      expect(appConfigSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("rejects standing rules on always-ask topics", async () => {
    const app = await loadApp("kids-gear");
    const bad = { ...app, policies: { ...app.policies, standingRuleTopics: ["price_terms"] } };
    expect(appConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown category references", async () => {
    const app = await loadApp("kids-gear");
    const bad = { ...app, policies: { ...app.policies, safetyRules: [{ id: "x", categories: ["nope"], requires: [], advice: "" }] } };
    expect(appConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown app id", async () => {
    await expect(loadApp("nope")).rejects.toThrow(/Unknown app/);
  });
});

describe("registered apps", () => {
  it.each(["kids-gear", "garden-tools"])("%s loads", async (id) => {
    expect((await loadApp(id)).id).toBe(id);
  });
});

import { readFileSync } from "node:fs";
import { inStage, findForbiddenItem, validateSandbox } from "./index";

describe("stages, forbidden items, pricing, region", () => {
  it("wraps stages around the cycle", () => {
    const winter = { from: 10, to: 2 };
    expect([10, 11, 0, 1].every((m) => inStage(winter, m, 12))).toBe(true);
    expect([2, 5, 9].some((m) => inStage(winter, m, 12))).toBe(false);
    expect(inStage({ from: 0, to: 3 }, 2)).toBe(true);
    expect(inStage({ from: 0, to: 3 }, 3)).toBe(false);
  });

  it("rejects a wrapping stage without a cycle, and out-of-cycle values", async () => {
    const app = await loadApp("garden-tools");
    expect(appConfigSchema.safeParse({ ...app, catalog: { ...app.catalog, stageCycle: undefined } }).success).toBe(false);
    const bad = { ...app, catalog: { ...app.catalog, stages: [{ id: "x", label: "x", from: 13, to: 2, needs: [], outgrows: [] }] } };
    expect(appConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("blocks forbidden items by keyword", async () => {
    const app = await loadApp("garden-tools");
    expect(findForbiddenItem(app, "Half a bottle of WEED KILLER")?.id).toBe("pesticides");
    expect(findForbiddenItem(app, "A good spade")).toBeUndefined();
  });

  it("requires a region and a valid pricing mode", async () => {
    const app = await loadApp("garden-tools");
    expect(app.region.name).toBe("Austin, TX");
    expect(app.policies.pricing.mode).toBe("swap_only");
    expect(appConfigSchema.safeParse({ ...app, region: undefined }).success).toBe(false);
    expect(appConfigSchema.safeParse({ ...app, policies: { ...app.policies, pricing: { mode: "paid" } } }).success).toBe(false);
  });

  it.each(["kids-gear", "garden-tools"])("%s sandbox city is valid", async (id) => {
    const app = await loadApp(id);
    const dir = `apps/${id}/${app.simulation.cityDir}`;
    const read = (f: string) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
    expect(validateSandbox(app, read("participants.json"), read("personas.json"))).toEqual([]);
  });
});
