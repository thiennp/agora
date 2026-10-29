import { describe, expect, it } from "vitest";
import { loadEnv, requireRuntimeEnv } from "./env";

describe("loadEnv", () => {
  it("has no mode: everything is optional, APP defaults to the simulation's example app, and variables of other tools are ignored", () => {
    const env = loadEnv({});
    expect(env.APP).toBe("kids-gear");
    expect(env.META_API_KEY).toBeUndefined();
    expect(env).not.toHaveProperty("MODE");
    expect(env).not.toHaveProperty("AGORA_MODE");
    expect(env).not.toHaveProperty("AGORA_INTAKE");
    // The old switches are not read any more: setting them changes nothing and fails nothing.
    expect(loadEnv({ MODE: "test", AGORA_MODE: "live", AGORA_INTAKE: "meta" })).toEqual(env);
  });

  it("still validates what it reads", () => {
    expect(() => loadEnv({ FIELD_ENCRYPTION_SECRET: "short" })).toThrow();
    expect(() => loadEnv({ AGENTWITCH_URL: "not a url" })).toThrow();
    expect(loadEnv({ AGORA_STATE_FILE: "/tmp/x.json", APP: "garden-tools" })).toMatchObject({ AGORA_STATE_FILE: "/tmp/x.json", APP: "garden-tools" });
  });
});

describe("requireRuntimeEnv", () => {
  const secrets = { FIELD_ENCRYPTION_SECRET: "a".repeat(16), REPORT_EXPORT_SECRET: "b".repeat(16) };

  it("fails by name for every missing key and never falls back", () => {
    expect(() => requireRuntimeEnv(loadEnv({}))).toThrow(/META_API_KEY, FIELD_ENCRYPTION_SECRET, REPORT_EXPORT_SECRET/);
    expect(() => requireRuntimeEnv(loadEnv({ META_API_KEY: "k" }))).toThrow(/FIELD_ENCRYPTION_SECRET, REPORT_EXPORT_SECRET/);
    expect(() => requireRuntimeEnv(loadEnv({ META_API_KEY: "k", FIELD_ENCRYPTION_SECRET: secrets.FIELD_ENCRYPTION_SECRET }))).toThrow(/REPORT_EXPORT_SECRET/);
    expect(() => requireRuntimeEnv(loadEnv({ ...secrets }))).toThrow(/META_API_KEY/);
    expect(() => requireRuntimeEnv(loadEnv({ META_API_KEY: "k", ...secrets }))).not.toThrow(/META_API_KEY.*FIELD/);
  });

  it("does not name a key that is present", () => {
    let message = "";
    try {
      requireRuntimeEnv(loadEnv({ META_API_KEY: "k" }));
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toMatch(/META_API_KEY/);
  });

  it("returns the settings when all three are set, and an empty string counts as missing", () => {
    const env = requireRuntimeEnv(loadEnv({ META_API_KEY: "k", ...secrets }));
    expect(env).toMatchObject({ META_API_KEY: "k", ...secrets });
    expect(() => requireRuntimeEnv(loadEnv({ META_API_KEY: "", ...secrets }))).toThrow(/META_API_KEY/);
  });
});
