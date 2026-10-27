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
