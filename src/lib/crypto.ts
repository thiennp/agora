import { createHash, createHmac } from "node:crypto";

export const sha256Hex = (input: string): string => createHash("sha256").update(input, "utf8").digest("hex");

/** Keyed hash for pseudonyms: stable for one secret, not reversible or linkable without it. */
export const hmacHex = (secret: string, input: string): string => createHmac("sha256", secret).update(input, "utf8").digest("hex");

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const key32 = (secret: string) => createHash("sha256").update(`agora.field.v1|${secret}`, "utf8").digest();

/** AES-256-GCM for fields that must stay private at rest (exact places and addresses). Output: v1.<iv>.<tag>.<ciphertext>, base64url. */
export function encryptText(secret: string, plain: string): string {
  if (secret.length < 16) throw new Error("encryption secret must be at least 16 characters");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key32(secret), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

/** Throws if the key is wrong or the value was changed. */
export function decryptText(secret: string, token: string): string {
  const [v, iv, tag, ct] = token.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("not an encrypted field");
  const d = createDecipheriv("aes-256-gcm", key32(secret), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}
