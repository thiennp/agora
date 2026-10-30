import { describe, expect, it } from "vitest";
import { ADMIN_COOKIE, adminTokenOf, isAdminToken } from "./token";

describe("admin token", () => {
  it("accepts only the exact token, and nothing when none is configured", () => {
    expect(isAdminToken("s3cret-token-1234", "s3cret-token-1234")).toBe(true);
    expect(isAdminToken("s3cret-token-12345", "s3cret-token-1234")).toBe(false);
    expect(isAdminToken("anything", undefined)).toBe(false);
    expect(isAdminToken(undefined, "s3cret-token-1234")).toBe(false);
  });
  it("reads the bearer header or the cookie, never the URL", () => {
    expect(adminTokenOf(new Request("http://x/?token=a", { headers: { authorization: "Bearer b" } }))).toBe("b");
    expect(adminTokenOf(new Request("http://x/", { headers: { cookie: `z=1; ${ADMIN_COOKIE}=c` } }))).toBe("c");
    expect(adminTokenOf(new Request("http://x/?token=a"))).toBeUndefined();
  });
});
