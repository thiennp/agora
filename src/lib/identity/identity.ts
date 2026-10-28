import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/crypto";

/**
 * Light identity (BR-45): a membership per person per app, a session per phone, a recovery code for a new phone. This is NOT
 * authentication against a real account: whoever holds a session token or the recovery code is that member, and nothing proves
 * who they are. It exists so that "only the app's creator and members see more than the join page" holds in the demo.
 *
 * Secrets (session tokens, recovery codes) are 128 to 256 random bits and only their SHA-256 is stored; a leaked store cannot be
 * replayed. The member id is a separate random value that may appear in URLs (it names a page, it does not open it).
 */
export type Role = "creator" | "member";

/** How a request proved itself. Only a person's own session may answer an always-ask card (BR-07); an external Muse never can. */
export type Via = "session" | "muse";

export interface Principal {
  appId: string;
  memberId: string;
  role: Role;
  via: Via;
}

export class IdentityError extends Error {
  constructor(readonly code: "unauthenticated" | "forbidden" | "too_many_members" | "invalid_recovery", message: string) {
    super(message);
  }
}

/** One document, replaced on every change. `StateBackend` in the entry layer satisfies this. */
export interface IdentityBackend {
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
}

interface MemberRow {
  appId: string;
  role: Role;
  name: string;
  createdAt: number;
  recoveryHash: string;
}
interface SessionRow {
  memberId: string;
  appId: string;
  expiresAt: number;
}
interface Doc {
  members: Record<string, MemberRow>;
  sessions: Record<string, SessionRow>;
}

export const SESSION_TTL_MS = 30 * 24 * 3600_000;
export const MAX_MEMBERS_PER_APP = 500;

const b64 = (bytes: number) => randomBytes(bytes).toString("base64url");
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 20 characters from 32 symbols (100 bits), shown as XXXXX-XXXXX-XXXXX-XXXXX so a person can copy it from a screen. */
function newRecoveryCode(): string {
  const bytes = randomBytes(20);
  const chars = Array.from(bytes, (b) => CODE_CHAR(b));
  return [0, 5, 10, 15].map((i) => chars.slice(i, i + 5).join("")).join("-");
}
// 256 is a multiple of 32, so `b % 32` is unbiased.
const CODE_CHAR = (b: number) => CODE_ALPHABET[b % 32]!;

/** Accept what a person typed: any case, spaces or dashes anywhere. */
export const normalizeRecoveryCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashCode = (code: string) => sha256Hex(`agora.recovery.v1|${normalizeRecoveryCode(code)}`);
const hashToken = (token: string) => sha256Hex(`agora.session.v1|${token}`);

export interface IdentityStore {
  /** A new membership and its first session. The recovery code is returned once and never stored in the clear. */
  join(appId: string, role: Role, name?: string): Promise<{ memberId: string; sessionToken: string; recoveryCode: string }>;
  /** The principal a session token stands for in that app, or undefined (missing, forged, expired, revoked or another app's). */
  authenticate(appId: string, token: string | undefined): Promise<Principal | undefined>;
  /** Signing out on this phone. */
  revoke(appId: string, token: string): Promise<void>;
  /** Recovery on a new phone: the code replaces every old session and is itself replaced, so a copied code works once. */
  recover(appId: string, code: string): Promise<{ memberId: string; role: Role; sessionToken: string; recoveryCode: string } | undefined>;
  /** Names and roles for the creator's view; never a secret. */
  members(appId: string): Promise<{ memberId: string; role: Role; name: string; joinedAt: string }[]>;
  hasCreator(appId: string): Promise<boolean>;
}

export function createIdentityStore(backend?: IdentityBackend, now: () => number = Date.now): IdentityStore {
  let doc: Doc | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  const loaded = async (): Promise<Doc> => {
    if (doc) return doc;
    const raw = await backend?.load();
    return (doc = raw ? (JSON.parse(raw) as Doc) : { members: {}, sessions: {} });
  };
  /** Changes run one at a time and are saved before they are reported, so a granted session is never lost on restart. */
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
  const sweep = (d: Doc) => {
    const t = now();
    for (const [h, s] of Object.entries(d.sessions)) if (s.expiresAt <= t) delete d.sessions[h];
  };
  const openSession = (d: Doc, memberId: string, appId: string): string => {
    const token = b64(32);
    d.sessions[hashToken(token)] = { memberId, appId, expiresAt: now() + SESSION_TTL_MS };
    return token;
  };
  return {
    join: (appId, role, name = "") =>
      mutate((d) => {
        sweep(d);
        if (Object.values(d.members).filter((m) => m.appId === appId).length >= MAX_MEMBERS_PER_APP) {
          throw new IdentityError("too_many_members", "This app has reached its limit of members.");
        }
        const memberId = b64(16);
        const recoveryCode = newRecoveryCode();
        d.members[memberId] = { appId, role, name: name.trim().slice(0, 60), createdAt: now(), recoveryHash: hashCode(recoveryCode) };
        return { memberId, sessionToken: openSession(d, memberId, appId), recoveryCode };
      }),
    async authenticate(appId, token) {
      if (!token || token.length > 128) return undefined;
      const d = await loaded();
      const s = d.sessions[hashToken(token)];
      if (!s || s.appId !== appId || s.expiresAt <= now()) return undefined;
      const m = d.members[s.memberId];
      if (!m || m.appId !== appId) return undefined;
      return { appId, memberId: s.memberId, role: m.role, via: "session" };
    },
    revoke: (appId, token) =>
      mutate((d) => {
        const h = hashToken(token);
        if (d.sessions[h]?.appId === appId) delete d.sessions[h];
      }),
    recover: (appId, code) =>
      mutate((d) => {
        if (normalizeRecoveryCode(code).length !== 20) return undefined;
        const h = hashCode(code);
        const hit = Object.entries(d.members).find(([, m]) => m.appId === appId && m.recoveryHash === h);
        if (!hit) return undefined;
        const [memberId, m] = hit;
        for (const [sh, s] of Object.entries(d.sessions)) if (s.memberId === memberId) delete d.sessions[sh];
        const recoveryCode = newRecoveryCode();
        m.recoveryHash = hashCode(recoveryCode);
        return { memberId, role: m.role, sessionToken: openSession(d, memberId, appId), recoveryCode };
      }),
    async members(appId) {
      const d = await loaded();
      return Object.entries(d.members)
        .filter(([, m]) => m.appId === appId)
        .sort((a, b) => a[1].createdAt - b[1].createdAt)
        .map(([memberId, m]) => ({ memberId, role: m.role, name: m.name, joinedAt: new Date(m.createdAt).toISOString() }));
    },
    async hasCreator(appId) {
      return Object.values((await loaded()).members).some((m) => m.appId === appId && m.role === "creator");
    },
  };
}

/** Always-ask decisions (owner cards) need the person's own tap in the app; an external Muse reads, never answers (BR-07, BR-44). */
export function assertHuman(p: Principal): void {
  if (p.via !== "session") throw new IdentityError("forbidden", "Only the person's own session can answer an owner card.");
}

export function assertCreator(p: Principal): void {
  if (p.role !== "creator") throw new IdentityError("forbidden", "Only the app's creator can do this.");
}

/** A member may open only their own page (`/app/{app}/muse/{id}`); the creator's admin view is a different route. */
export function assertSelf(p: Principal, memberId: string): void {
  if (p.memberId !== memberId) throw new IdentityError("forbidden", "This page belongs to another member.");
}
