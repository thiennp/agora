import { describe, expect, it } from "vitest";
import { decryptText, encryptText, hmacHex, sha256Hex } from "./crypto";

describe("crypto", () => {
  it("round-trips an encrypted field and uses a fresh IV each time", () => {
    const a = encryptText("secret-0123456789ab", "Beispielstraße 12");
    const b = encryptText("secret-0123456789ab", "Beispielstraße 12");
    expect(a).not.toBe(b);
    expect(a).not.toContain("Beispiel");
    expect(decryptText("secret-0123456789ab", a)).toBe("Beispielstraße 12");
  });

  it("fails with the wrong key or a changed value", () => {
    const t = encryptText("secret-0123456789ab", "hello world");
    expect(() => decryptText("another-secret-0123", t)).toThrow();
    const parts = t.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptText("secret-0123456789ab", parts.join("."))).toThrow();
    expect(() => decryptText("secret-0123456789ab", "plain text")).toThrow();
    expect(() => encryptText("short", "x")).toThrow();
  });

  it("hashes deterministically and keys pseudonyms", () => {
    expect(sha256Hex("a")).toBe(sha256Hex("a"));
    expect(hmacHex("k1-0123456789abcdef", "x")).not.toBe(hmacHex("k2-0123456789abcdef", "x"));
  });
});
