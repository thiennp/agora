import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("defaults to mock mode", () => {
    expect(loadEnv({}).MODE).toBe("mock");
  });

  it("requires a Meta key in live mode", () => {
    expect(() => loadEnv({ MODE: "live" })).toThrow();
    expect(loadEnv({ MODE: "live", META_API_KEY: "k" }).MODE).toBe("live");
  });
});
