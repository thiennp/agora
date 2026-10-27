import { describe, expect, it } from "vitest";
import type { Lesson, Outcome } from "../core/context.schema";
import type { MemoryProvider } from "../core/memory-provider.port";
import { createLocalProvider } from "../../features/local/public-api/infrastructure";
import { createAgentWitchProvider, AgentWitchFatalError } from "../../features/agentwitch/public-api/infrastructure";
import type { AgentWitchClient } from "../../features/agentwitch/public-api/types";

const lesson = (familyId: string, id = "l1", over: Partial<Lesson> = {}): Lesson => ({
  id, familyId, kind: "decline", key: "decline:price:clothing", text: "Declined clothing deals because of price.", evidenceDealIds: ["d1"], count: 1, confidence: 0.5,
  source: "local", createdAt: "2026-10-27T12:00:00Z", updatedAt: "2026-10-27T12:00:00Z", ...over,
});
const outcome = (dealId: string, result: Outcome["result"] = "declined"): Outcome => ({ dealId, result, reasonCode: "price", category: "clothing", at: "2026-10-27T12:00:00Z" });

/** Contract every memory provider passes (MEM-LOC-01, MEM-AGW-04). */
function contract(name: string, make: () => MemoryProvider) {
  describe(`memory contract: ${name}`, () => {
    it("starts empty and stores lessons and outcomes per family", async () => {
      const m = make();
      expect(await m.getFamilyContext("a")).toEqual({ familyId: "a", lessons: [], recentOutcomes: [] });
      await m.recordLesson("a", lesson("a"));
      await m.recordDealOutcome("a", outcome("d1"));
      const c = await m.getFamilyContext("a");
      expect(c.lessons).toHaveLength(1);
      expect(c.recentOutcomes[0]).toMatchObject({ dealId: "d1", result: "declined" });
    });

    it("replaces a lesson with the same id and deletes by id", async () => {
      const m = make();
      await m.recordLesson("a", lesson("a"));
      await m.recordLesson("a", lesson("a", "l1", { count: 2, confidence: 0.75 }));
      expect((await m.getFamilyContext("a")).lessons).toMatchObject([{ count: 2 }]);
      expect(await m.deleteLesson("a", "l1")).toBe(true);
      expect(await m.deleteLesson("a", "l1")).toBe(false);
      expect((await m.getFamilyContext("a")).lessons).toEqual([]);
    });

    it("never mixes families (MEM-03)", async () => {
      const m = make();
      await m.recordLesson("a", lesson("a"));
      await m.recordDealOutcome("a", outcome("d1"));
      expect(await m.getFamilyContext("b")).toEqual({ familyId: "b", lessons: [], recentOutcomes: [] });
      await expect(m.recordLesson("b", lesson("a", "x"))).rejects.toThrow();
      expect(await m.deleteLesson("b", "l1")).toBe(false);
    });

    it("returns copies, so callers cannot change stored data", async () => {
      const m = make();
      await m.recordLesson("a", lesson("a"));
      (await m.getFamilyContext("a")).lessons[0]!.text = "tampered";
      expect((await m.getFamilyContext("a")).lessons[0]!.text).toMatch(/Declined/);
    });

    it("erases one family without touching another", async () => {
      const m = make();
      await m.recordLesson("a", lesson("a"));
      await m.recordLesson("b", lesson("b", "l2"));
      await m.eraseFamily("a");
      expect((await m.getFamilyContext("a")).lessons).toEqual([]);
      expect((await m.getFamilyContext("b")).lessons).toHaveLength(1);
    });
  });
}

const okClient = (): AgentWitchClient & { updates: string[]; outcomes: string[] } => {
  const updates: string[] = [];
  const outcomes: string[] = [];
  return { updates, outcomes, knowledgeUpdate: async (_p, l) => void updates.push(l), mirrorOutcome: async (_p, o) => void outcomes.push(o.dealId) };
};

contract("local", () => createLocalProvider());
contract("agentwitch (mirror)", () => createAgentWitchProvider({ client: okClient(), projectIdOf: (f) => `proj-${f}`, shouldMirror: () => true }));

describe("agentwitch mirror", () => {
  it("writes lessons through the knowledge endpoint and mirrors outcomes, one project per family (MEM-AGW-01, 02)", async () => {
    const client = okClient();
    const seen: string[] = [];
    const m = createAgentWitchProvider({ client: { ...client, knowledgeUpdate: async (p, l) => { seen.push(p); await client.knowledgeUpdate(p, l); } }, projectIdOf: (f) => `proj-${f}`, shouldMirror: () => true });
    await m.recordLesson("a", lesson("a"));
    await m.recordLesson("b", lesson("b", "l2"));
    await m.recordDealOutcome("a", outcome("d1"));
    await Promise.resolve();
    expect(seen).toEqual(["proj-a", "proj-b"]);
    expect(client.updates[0]).toMatch(/Declined clothing deals because of price\. \(confidence 0\.50, seen 1 times\)/);
    expect(client.outcomes).toEqual(["d1"]);
  });

  it("mirrors nothing without consent or without a project", async () => {
    const client = okClient();
    const noConsent = createAgentWitchProvider({ client, projectIdOf: () => "p", shouldMirror: () => false });
    await noConsent.recordLesson("a", lesson("a"));
    const noProject = createAgentWitchProvider({ client, projectIdOf: () => undefined, shouldMirror: () => true });
    await noProject.recordLesson("a", lesson("a"));
    expect(client.updates).toEqual([]);
    expect((await noConsent.getFamilyContext("a")).lessons).toHaveLength(1);
  });

  it("never blocks on a failure, logs it and retries later, and stops after fatal errors (MEM-04, MEM-AGW-03)", async () => {
    let failing = true;
    const errors: unknown[] = [];
    const sent: string[] = [];
    const m = createAgentWitchProvider({
      client: { knowledgeUpdate: async (_p, l) => { if (failing) throw new Error("down"); sent.push(l); }, mirrorOutcome: async () => { throw new AgentWitchFatalError("agentwitch 409"); } },
      projectIdOf: () => "p", shouldMirror: () => true, onError: (e) => errors.push(e),
    });
    await m.recordLesson("a", lesson("a"));
    await m.recordDealOutcome("a", outcome("d1"));
    await Promise.resolve();
    expect((await m.getFamilyContext("a")).lessons).toHaveLength(1);
    expect(errors).toMatchObject([{ what: "lesson", fatal: false, attempts: 1 }, { what: "outcome", fatal: true, attempts: 1 }]);
    expect(m.pending()).toBe(1);
    failing = false;
    expect(await m.flush()).toEqual({ sent: 1, pending: 0 });
    expect(sent).toHaveLength(1);
    expect(await m.flush()).toEqual({ sent: 0, pending: 0 });
  });

  it("gives up after five attempts", async () => {
    const m = createAgentWitchProvider({ client: { knowledgeUpdate: async () => { throw new Error("down"); }, mirrorOutcome: async () => undefined }, projectIdOf: () => "p", shouldMirror: () => true });
    await m.recordLesson("a", lesson("a"));
    await Promise.resolve();
    for (let i = 0; i < 6; i++) await m.flush();
    expect(m.pending()).toBe(0);
  });
});
