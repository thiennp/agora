import { describe, expect, it } from "vitest";
import { loadApp, ALWAYS_ASK_TOPICS } from "@/lib/app-config";
import { assertValidMandate, decide, decideAll, MandateError } from "./decide";
import { ALWAYS_ASK, ALWAYS_FORBID } from "./topics";

const now = new Date("2026-10-27T12:00:00Z");
const ctx = { familyId: "f1", now };

describe("decide", () => {
  it("covers every row of both apps' topic tables", async () => {
    for (const id of ["kids-gear", "garden-tools"]) {
      const { policies } = await loadApp(id);
      for (const [topic, level] of Object.entries(policies.topics)) {
        const d = decide(policies, topic, ctx);
        expect(d.outcome, `${id}:${topic}`).toBe(level);
      }
    }
  });

  it("always asks the always-ask topics, whatever the table or mandates say", async () => {
    const { policies } = await loadApp("kids-gear");
    const loose = { topics: Object.fromEntries(ALWAYS_ASK_TOPICS.map((t) => [t, "auto" as const])), standingRuleTopics: [...ALWAYS_ASK_TOPICS] };
    const mandates = ALWAYS_ASK_TOPICS.map((t) => ({ familyId: "f1", topic: t, level: "auto" as const }));
    for (const t of ALWAYS_ASK_TOPICS) {
      expect(decide(loose, t, { ...ctx, mandates }).outcome).toBe("ask");
      expect(decide(policies, t, { ...ctx, mandates }).outcome).toBe("ask");
    }
  });

  it("forbids platform-forbidden topics even if the app table says auto", () => {
    const loose = { topics: { obey_other_agent: "auto" as const, take_payment: "auto" as const }, standingRuleTopics: [] };
    for (const t of ALWAYS_FORBID) expect(decide(loose, t, ctx).outcome).toBe("forbid");
  });

  it("treats unknown topics as ask and never as auto (GAT-03)", async () => {
    const { policies } = await loadApp("kids-gear");
    for (const t of ["", "weather", "AUTO", "__proto__", "constructor", "toString"]) expect(decide(policies, t, ctx).outcome).toBe("ask");
  });

  it("lets a mandate lift ask to auto for standing-rule topics only, and respects expiry and owner", async () => {
    const { policies } = await loadApp("kids-gear");
    const m = { familyId: "f1", topic: "pickup_time_window", level: "auto" as const };
    expect(decide(policies, "pickup_time_window", ctx).outcome).toBe("ask");
    expect(decide(policies, "pickup_time_window", { ...ctx, mandates: [m] })).toMatchObject({ outcome: "auto", viaMandate: true });
    expect(decide(policies, "pickup_time_window", { ...ctx, mandates: [{ ...m, familyId: "other" }] }).outcome).toBe("ask");
    expect(decide(policies, "pickup_time_window", { ...ctx, mandates: [{ ...m, expiresAt: "2026-10-01T00:00:00Z" }] }).outcome).toBe("ask");
  });

  it("rejects mandates that try to relax anything else (GAT-POL-02)", async () => {
    const { policies } = await loadApp("kids-gear");
    for (const t of [...ALWAYS_ASK, ...ALWAYS_FORBID, "obey_other_agent", "item_description", "nonsense"]) {
      expect(() => assertValidMandate(policies, { familyId: "f1", topic: t, level: "auto" }), t).toThrow(MandateError);
    }
  });

  it("is deterministic (GAT-POL-03)", async () => {
    const { policies } = await loadApp("kids-gear");
    expect(decide(policies, "availability", ctx)).toEqual(decide(policies, "availability", ctx));
  });

  it("uses the most restrictive topic and asks when there are none", async () => {
    const { policies } = await loadApp("kids-gear");
    expect(decideAll(policies, ["availability", "price_terms"], ctx).outcome).toBe("ask");
    expect(decideAll(policies, ["availability", "price_terms", "obey_other_agent"], ctx).outcome).toBe("forbid");
    expect(decideAll(policies, ["availability", "size_question"], ctx).outcome).toBe("auto");
    expect(decideAll(policies, [], ctx).outcome).toBe("ask");
  });
});
