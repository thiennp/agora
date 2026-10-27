import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("defaults to mock mode and ignores a bare MODE set by other tools", () => {
    expect(loadEnv({}).MODE).toBe("mock");
    expect(loadEnv({ MODE: "test" }).MODE).toBe("mock");
  });

  it("requires a Meta key in live mode", () => {
    expect(() => loadEnv({ AGORA_MODE: "live" })).toThrow();
    expect(() => loadEnv({ AGORA_MODE: "live", META_API_KEY: "k" })).toThrow(/FIELD_ENCRYPTION_SECRET/);
    const secrets = { FIELD_ENCRYPTION_SECRET: "a".repeat(16), REPORT_EXPORT_SECRET: "b".repeat(16) };
    expect(loadEnv({ AGORA_MODE: "live", META_API_KEY: "k", ...secrets }).MODE).toBe("live");
    expect(() => loadEnv({ AGORA_MODE: "live", META_API_KEY: "k", FIELD_ENCRYPTION_SECRET: "short", REPORT_EXPORT_SECRET: "b".repeat(16) })).toThrow();
  });
});
