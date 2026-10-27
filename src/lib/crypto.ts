import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const sha256Hex = (input: string): string => createHash("sha256").update(input, "utf8").digest("hex");

/** Keyed hash for pseudonyms: stable for one secret, not reversible or linkable without it. */
export const hmacHex = (secret: string, input: string): string => createHmac("sha256", secret).update(input, "utf8").digest("hex");

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}
