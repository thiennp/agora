import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/crypto";
import type { IdentityBackend } from "./identity";

/**
 * Per-member keys for a person's own Muse (BR-44, docs/MUSE-CONNECTOR.md). A key opens read-only views of one member in one app and
 * nothing else; it is not a session, so it cannot answer an owner card or change anything (BR-07). 256 random bits, shown once, and only
 * its SHA-256 is stored (like session tokens), so a leaked store cannot be replayed. The key carries a fixed prefix so secret scanners
 * and a person pasting it into Muse can tell what it is; the prefix adds no entropy and is not secret.
 */
const MUSE_KEY_PREFIX = "agmk_";
const MAX_ACTIVE_KEYS_PER_MEMBER = 3;

export class MuseKeyError extends Error {
  constructor(readonly code: "too_many_keys" | "not_found", message: string) {
    super(message);
  }
}

interface KeyRow {
  keyId: string;
  appId: string;
  memberId: string;
  label: string;
  createdAt: number;
  revokedAt?: number;
}
interface Doc {
  /** Keyed by the hash of the key. */
  keys: Record<string, KeyRow>;
}

/** What a person may see about their keys: never the key, never its hash. */
export interface MuseKeyInfo {
  keyId: string;
  label: string;
  createdAt: string;
  revoked: boolean;
}

export interface MuseKeyStore {
  /** A new key for the member. Returned once and never stored in the clear. */
  issue(appId: string, memberId: string, label?: string): Promise<{ keyId: string; key: string }>;
  /** Who a key stands for, or undefined (unknown, forged, revoked). The caller must still compare the app with the one asked for. */
  authenticate(key: string | undefined): Promise<{ appId: string; memberId: string; keyId: string } | undefined>;
  /** Revoke one of the member's own keys; another member's key id is "not found". Revoking twice is fine. */
  revoke(appId: string, memberId: string, keyId: string): Promise<void>;
  list(appId: string, memberId: string): Promise<MuseKeyInfo[]>;
}

const hashKey = (key: string) => sha256Hex(`agora.musekey.v1|${key}`);

export function createMuseKeyStore(backend?: IdentityBackend, now: () => number = Date.now): MuseKeyStore {
  let doc: Doc | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  const loaded = async (): Promise<Doc> => {
    if (doc) return doc;
    const raw = await backend?.load();
    return (doc = raw ? (JSON.parse(raw) as Doc) : { keys: {} });
  };
  const mutate = <T>(fn: (d: Doc) => T): Promise<T> => {
    const run = tail.then(async () => {
      const d = await loaded();
      const out = fn(d);
      await backend?.save(JSON.stringify(d));
      return out;
    });
    tail = run.catch(() => undefined);
    return run;
  };
  return {
    issue: (appId, memberId, label = "") =>
      mutate((d) => {
        const mine = Object.values(d.keys).filter((k) => k.appId === appId && k.memberId === memberId && !k.revokedAt);
        if (mine.length >= MAX_ACTIVE_KEYS_PER_MEMBER) throw new MuseKeyError("too_many_keys", "Revoke an old key before making a new one.");
        const key = MUSE_KEY_PREFIX + randomBytes(32).toString("base64url");
        const keyId = randomBytes(8).toString("base64url");
        d.keys[hashKey(key)] = { keyId, appId, memberId, label: label.trim().slice(0, 40), createdAt: now() };
        return { keyId, key };
      }),
    async authenticate(key) {
      if (!key || key.length > 128 || !key.startsWith(MUSE_KEY_PREFIX)) return undefined;
      const row = (await loaded()).keys[hashKey(key)];
      if (!row || row.revokedAt) return undefined;
      return { appId: row.appId, memberId: row.memberId, keyId: row.keyId };
    },
    revoke: (appId, memberId, keyId) =>
      mutate((d) => {
        const row = Object.values(d.keys).find((k) => k.keyId === keyId && k.appId === appId && k.memberId === memberId);
        if (!row) throw new MuseKeyError("not_found", "No such key.");
        row.revokedAt ??= now();
      }),
    async list(appId, memberId) {
      return Object.values((await loaded()).keys)
        .filter((k) => k.appId === appId && k.memberId === memberId)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((k) => ({ keyId: k.keyId, label: k.label, createdAt: new Date(k.createdAt).toISOString(), revoked: !!k.revokedAt }));
    },
  };
}
