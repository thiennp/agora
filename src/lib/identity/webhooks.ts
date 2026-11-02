import { randomBytes } from "node:crypto";
import type { IdentityBackend } from "./identity";

/**
 * A member's webhook, for an assistant that can receive requests (docs/MUSE-CONNECTOR.md). The assistant registers an https address with
 * its own read-only key; the app then sends a small "something changed" request there and the assistant reads the details with the same
 * key. One webhook per member per app. The signing secret must be kept in the clear (it signs every request), so it lives only in this
 * store, is shown once, and is never returned again. The webhook can only tell an assistant that something changed: it carries counts and
 * a poll address, never text, names, addresses or cards.
 */
export const MAX_WEBHOOK_FAILURES = 5;

export interface WebhookRow {
  appId: string;
  memberId: string;
  url: string;
  secret: string;
  createdAt: number;
  /** Updates up to here were already announced (the updates cursor). */
  cursor: string;
  /** Cards waiting for the member at the last announcement, so a new card announces itself once. */
  lastWaiting: number;
  failures: number;
  lastAttemptAt?: number;
  lastStatus?: number | string;
}
interface Doc {
  hooks: Record<string, WebhookRow>;
}

/** What the assistant may see about its own webhook: never the secret. */
export interface WebhookInfo {
  url: string;
  createdAt: string;
  active: boolean;
  failures: number;
  lastAttemptAt?: string;
  lastStatus?: number | string;
}

export interface WebhookStore {
  /** Replaces the member's webhook. The secret is the assistant's own (16 to 128 characters) or a new random one; returned once. */
  set(appId: string, memberId: string, input: { url: string; secret?: string; cursor: string; waiting: number }): Promise<{ secret: string }>;
  get(appId: string, memberId: string): Promise<WebhookInfo | undefined>;
  remove(appId: string, memberId: string): Promise<void>;
  /** Every live webhook of the app, with secrets: for the sender only, never for an answer. */
  listForApp(appId: string): Promise<WebhookRow[]>;
  /** After an attempt: `ok` moves the cursor on and clears failures; a failure counts toward the limit. Without `status` nothing was sent (only the bookkeeping moved). */
  record(appId: string, memberId: string, result: { ok: boolean; status?: number | string; cursor?: string; waiting?: number }): Promise<void>;
}

const keyOf = (appId: string, memberId: string) => `${appId}|${memberId}`;
const info = (r: WebhookRow): WebhookInfo => ({
  url: r.url,
  createdAt: new Date(r.createdAt).toISOString(),
  active: r.failures < MAX_WEBHOOK_FAILURES,
  failures: r.failures,
  ...(r.lastAttemptAt ? { lastAttemptAt: new Date(r.lastAttemptAt).toISOString() } : {}),
  ...(r.lastStatus !== undefined ? { lastStatus: r.lastStatus } : {}),
});

export function createWebhookStore(backend?: IdentityBackend, now: () => number = () => Date.now()): WebhookStore {
  let doc: Doc | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  const loaded = async (): Promise<Doc> => {
    if (doc) return doc;
    const raw = await backend?.load();
    return (doc = raw ? (JSON.parse(raw) as Doc) : { hooks: {} });
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
    set: (appId, memberId, input) =>
      mutate((d) => {
        const secret = input.secret ?? randomBytes(32).toString("base64url");
        d.hooks[keyOf(appId, memberId)] = { appId, memberId, url: input.url, secret, createdAt: now(), cursor: input.cursor, lastWaiting: input.waiting, failures: 0 };
        return { secret };
      }),
    async get(appId, memberId) {
      const r = (await loaded()).hooks[keyOf(appId, memberId)];
      return r ? info(r) : undefined;
    },
    remove: (appId, memberId) =>
      mutate((d) => {
        delete d.hooks[keyOf(appId, memberId)];
      }),
    async listForApp(appId) {
      return Object.values((await loaded()).hooks).filter((r) => r.appId === appId && r.failures < MAX_WEBHOOK_FAILURES);
    },
    record: (appId, memberId, result) =>
      mutate((d) => {
        const r = d.hooks[keyOf(appId, memberId)];
        if (!r) return;
        if (result.status !== undefined) {
          r.lastAttemptAt = now();
          r.lastStatus = result.status;
        }
        if (result.ok) {
          r.failures = 0;
          if (result.cursor !== undefined) r.cursor = result.cursor;
          if (result.waiting !== undefined) r.lastWaiting = result.waiting;
        } else r.failures += 1;
      }),
  };
}
