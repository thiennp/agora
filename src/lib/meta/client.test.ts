import { describe, expect, it } from "vitest";
import { z } from "zod";
import { loadApp } from "../app-config";
import { createMockAdapter } from "./adapters/mock";
import { createHttpAdapter } from "./adapters/openai-compatible";
import { createMetaClient, createMetaClientFromEnv } from "./client";
import { BudgetExceededError, CostMeter } from "./cost-meter";
import { createRouter } from "./router";
import type { ModelRequest } from "./types";

const providers = { "muse-spark": "mock", "muse-spark-open": "mock" } as const;

async function setup(handler?: (r: ModelRequest) => string, budget = { perParticipantUsd: 1, globalUsd: 10 }) {
  const app = await loadApp("kids-gear");
  const seen: ModelRequest[] = [];
  const adapter = createMockAdapter((r) => {
    seen.push(r);
    return handler ? handler(r) : "ok";
  });
  const meter = new CostMeter(budget);
  const client = createMetaClient({ app, adapters: { mock: adapter }, router: createRouter({ providers }), meter });
  return { client, meter, seen, app };
}

describe("meta client", () => {
  it("routes roles to models from the table and records every call", async () => {
    const { client, meter, seen } = await setup();
    await client.call({ role: "negotiator", prompt: "hi", participantId: "f1" });
    await client.call({ role: "forecaster", prompt: "hi", participantId: "f1" });
    expect(seen.map((r) => r.model)).toEqual(["muse-spark", "muse-spark-open"]);
    const s = meter.summary();
    expect(s.calls).toBe(2);
    expect(s.byRole.negotiator?.calls).toBe(1);
    expect(s.totalUsd).toBeGreaterThan(0);
  });

  it("keeps counts only in the call record: neither the prompt nor the reply text is retained (logs never hold message text)", async () => {
    const app = await loadApp("kids-gear");
    const sunk: unknown[] = [];
    const adapter = createMockAdapter(() => "SECRET-REPLY-TEXT");
    const meter = new CostMeter({ perParticipantUsd: 1, globalUsd: 10 }, (record) => sunk.push(record));
    const client = createMetaClient({ app, adapters: { mock: adapter }, router: createRouter({ providers }), meter });
    await client.call({ role: "negotiator", prompt: "SECRET-PROMPT-TEXT", participantId: "f1" });
    expect(sunk).toHaveLength(1);
    expect(Object.keys(sunk[0] as object).sort()).toEqual(
      ["costUsd", "inputTokens", "latencyMs", "model", "ok", "outputTokens", "participantId", "provider", "role"],
    );
    expect(JSON.stringify(sunk)).not.toContain("SECRET");
  });

  it("injects app context and the untrusted-text rule", async () => {
    const { client, seen, app } = await setup();
    await client.call({ role: "translator", prompt: "x" });
    expect(seen[0]?.system).toContain(app.name);
    expect(seen[0]?.system).toContain(app.participant.noun);
    expect(seen[0]?.system).toContain("untrusted");
  });

  it("validates output against a schema and retries once", async () => {
    let n = 0;
    const { client, meter } = await setup(() => (n++ === 0 ? "not json" : '{"a":1}'));
    const out = await client.call({ role: "lessons", prompt: "x", schema: z.object({ a: z.number() }) });
    expect(out).toEqual({ a: 1 });
    expect(meter.summary().calls).toBe(2);
  });

  it("never returns output that fails the schema", async () => {
    const { client } = await setup(() => '{"a":"wrong"}');
    await expect(client.call({ role: "lessons", prompt: "x", schema: z.object({ a: z.number() }) })).rejects.toThrow();
  });

  it("stops calls when a participant budget is spent", async () => {
    const { client } = await setup(() => "x".repeat(4_000_000), { perParticipantUsd: 0.000001, globalUsd: 10 });
    await client.call({ role: "negotiator", prompt: "x", participantId: "f1" });
    await expect(client.call({ role: "negotiator", prompt: "x", participantId: "f1" })).rejects.toBeInstanceOf(BudgetExceededError);
    await expect(client.call({ role: "negotiator", prompt: "x", participantId: "f2" })).resolves.toBeDefined();
  });

  it("stops everything at the global breaker", async () => {
    const { client } = await setup(() => "x".repeat(4_000_000), { perParticipantUsd: 10, globalUsd: 0.000001 });
    await client.call({ role: "negotiator", prompt: "x" });
    await expect(client.call({ role: "negotiator", prompt: "x" })).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it("allows per-role routing overrides for benchmarks", async () => {
    const app = await loadApp("kids-gear");
    const seen: ModelRequest[] = [];
    const client = createMetaClient({
      app,
      adapters: { mock: createMockAdapter((r) => (seen.push(r), "ok")) },
      router: createRouter({ providers, overrides: { negotiator: "muse-spark-open" } }),
      meter: new CostMeter({ perParticipantUsd: 1, globalUsd: 1 }),
    });
    await client.call({ role: "negotiator", prompt: "x" });
    expect(seen[0]?.model).toBe("muse-spark-open");
  });

  it("works offline in mock mode", async () => {
    const app = await loadApp("kids-gear");
    const client = createMetaClientFromEnv(app, { MODE: "mock", APP: "kids-gear" });
    expect(await client.call({ role: "translator", prompt: "hello" })).toContain("mock");
  });

  it("http adapter posts chat completions and reads usage", async () => {
    let url = "";
    const adapter = createHttpAdapter({
      provider: "meta-api",
      baseUrl: "https://example.test/v1/",
      apiKey: "k",
      fetchImpl: (async (u: string) => {
        url = u;
        return new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }));
      }) as unknown as typeof fetch,
    });
    const res = await adapter.complete({ model: "muse-spark", system: "s", prompt: "p" });
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect(res).toEqual({ text: "hi", inputTokens: 3, outputTokens: 2 });
  });
});
