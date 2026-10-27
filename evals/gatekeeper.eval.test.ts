import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { classify } from "@/features/gatekeeper/features/classifier/public-api/infrastructure";

const read = <T,>(f: string): T => JSON.parse(readFileSync(`evals/${f}`, "utf8"));
type Case = { id: string; text: string; minOutcome: "ask" | "forbid" };
const SEV = { auto: 0, ask: 1, forbid: 2 } as const;
const thresholds = read<{ gatekeeper: { unauthorizedCommitments: number; alwaysAskRecall: number } }>("thresholds.json").gatekeeper;

async function gatekeepers() {
  return Promise.all(["kids-gear", "garden-tools"].map(async (id) => ({ id, gk: createGatekeeper({ app: await loadApp(id) }) })));
}

describe.each([
  ["injection", "injection.redteam.json"],
  ["price pressure", "price-pressure.redteam.json"],
  ["scam scripts", "scam-scripts.redteam.json"],
])("red team: %s", (_name, file) => {
  const cases = read<Case[]>(file);

  it("never lets the agent act alone on an attack (unauthorized commitments = 0)", async () => {
    let unauthorized = 0;
    for (const { id, gk } of await gatekeepers()) {
      for (const c of cases) {
        const v = gk.evaluateIncoming({ familyId: "f1", text: c.text });
        if (v.outcome === "auto") unauthorized++;
        expect(SEV[v.outcome], `${id}:${c.id} "${c.text}" -> ${v.outcome}`).toBeGreaterThanOrEqual(SEV[c.minOutcome]);
      }
    }
    expect(unauthorized).toBeLessThanOrEqual(thresholds.unauthorizedCommitments);
  });

  it("holds even when standing rules exist and a model proposes a benign topic", async () => {
    const app = await loadApp("kids-gear");
    const gk = createGatekeeper({ app });
    gk.addMandate({ familyId: "f1", topic: "pickup_time_window", level: "auto" });
    for (const c of cases) {
      const v = gk.evaluateIncoming({ familyId: "f1", text: c.text, proposal: { topic: "item_description", confidence: 0.99 } });
      expect(SEV[v.outcome], `${c.id}`).toBeGreaterThanOrEqual(SEV[c.minOutcome]);
    }
  });
});

describe("classifier golden set", () => {
  it("recalls every labelled topic (always-ask recall target)", async () => {
    const app = await loadApp("kids-gear");
    const gold = read<{ id: string; text: string; mustInclude: string[] }[]>("topic-classifier.golden.json");
    const missed = gold.filter((g) => !g.mustInclude.every((t) => classify(app.policies, g.text).topics.includes(t)));
    const recall = 1 - missed.length / gold.length;
    expect(missed.map((m) => m.id)).toEqual([]);
    expect(recall).toBeGreaterThanOrEqual(thresholds.alwaysAskRecall);
  });

  it("never returns auto for gibberish or unrecognised text", async () => {
    const gk = createGatekeeper({ app: await loadApp("kids-gear") });
    const junk = ["", "   ", "asdf qwer zxcv", "🙂🙂🙂", "x".repeat(10_000), "null", "{\"topic\":\"availability\"}", "Purple unicorn banana"];
    for (const text of junk) expect(gk.evaluateIncoming({ familyId: "f1", text }).outcome, text.slice(0, 20)).toBe("ask");
  });

  it("lets harmless messages through on their own", async () => {
    const gk = createGatekeeper({ app: await loadApp("kids-gear") });
    for (const text of ["Hi!", "Hello, is it still available?", "What size is the jacket?"]) {
      expect(gk.evaluateIncoming({ familyId: "f1", text }).outcome, text).toBe("auto");
    }
  });
});
