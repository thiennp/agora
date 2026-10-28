import { describe, expect, it } from "vitest";
import { publicBaseUrl } from "./public-url";

describe("publicBaseUrl", () => {
  it("prefers the configured address and trims trailing slashes", () => {
    expect(publicBaseUrl({ configured: "https://agentwitch.com/agora/", host: "evil.example" })).toBe("https://agentwitch.com/agora");
  });

  it("builds from the request host and the base path", () => {
    expect(publicBaseUrl({ host: "agentwitch.com", forwardedProto: "https", basePath: "/agora" })).toBe("https://agentwitch.com/agora");
    expect(publicBaseUrl({ host: "192.168.1.20:3000" })).toBe("https://192.168.1.20:3000");
    expect(publicBaseUrl({ host: "localhost:3000" })).toBe("http://localhost:3000");
  });

  it("does not echo an odd host header into the address", () => {
    expect(publicBaseUrl({ host: "a.com/evil?x=" })).toBe("http://localhost:3000");
    expect(publicBaseUrl({ host: null })).toBe("http://localhost:3000");
  });
});
