import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Pool } from "pg";

/** Where the demo's tracked state is kept between restarts. One document, replaced on every save. */
export interface StateBackend {
  kind: "file" | "postgres";
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

export function createFileBackend(path: string): StateBackend {
  return {
    kind: "file",
    async load() {
      try {
        return await readFile(path, "utf8");
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async save(json) {
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      await writeFile(tmp, json, "utf8");
      await rename(tmp, path);
    },
    async clear() {
      await rm(path, { force: true });
    },
    async close() {},
  };
}

export function createPostgresBackend(url: string, ID = "platform"): StateBackend {
  const pool = new Pool({ connectionString: url, max: 2 });
  let ready: Promise<unknown> | null = null;
  const ensure = () =>
    (ready ??= pool.query("create table if not exists app_state (id text primary key, doc jsonb not null, updated_at timestamptz not null default now())"));
  return {
    kind: "postgres",
    async load() {
      await ensure();
      const r = await pool.query<{ doc: unknown }>("select doc from app_state where id = $1", [ID]);
      return r.rows[0] ? JSON.stringify(r.rows[0].doc) : null;
    },
    async save(json) {
      await ensure();
      await pool.query(
        "insert into app_state (id, doc, updated_at) values ($1, $2::jsonb, now()) on conflict (id) do update set doc = excluded.doc, updated_at = now()",
        [ID, json],
      );
    },
    async clear() {
      await ensure();
      await pool.query("delete from app_state where id = $1", [ID]);
    },
    async close() {
      await pool.end();
    },
  };
}

/**
 * DATABASE_URL wins over AGORA_STATE_FILE; with neither, state lives only in memory. Each app has its own saved document (BR-41): the
 * app the demo runs on (`APP`) keeps the original name, every other app adds its id (`platform:<app>`, `<file>.<app>`).
 */
export function backendFromEnv(env: { DATABASE_URL?: string; AGORA_STATE_FILE?: string }, appId?: string): StateBackend | null {
  if (env.DATABASE_URL) return createPostgresBackend(env.DATABASE_URL, appId ? `platform:${appId}` : "platform");
  if (env.AGORA_STATE_FILE) return createFileBackend(appId ? `${env.AGORA_STATE_FILE}.${appId}` : env.AGORA_STATE_FILE);
  return null;
}
