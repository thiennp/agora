import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Pool } from "pg";
import { appConfigSchema, createMemoryBackend, type AppBackend } from "@/lib/app-config";

/** Stored apps (BR-41) in a JSON file: a list of configs, replaced atomically. Writes are queued so two inserts never race. */
export function createFileAppBackend(path: string): AppBackend {
  let tail: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<unknown[]> => {
    try {
      return JSON.parse(await readFile(path, "utf8")) as unknown[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  };
  return {
    kind: "file",
    list: () => read(),
    insert(config) {
      const run = tail.then(async () => {
        const rows = await read();
        if (rows.some((r) => (r as { id?: unknown }).id === config.id)) return false;
        await mkdir(dirname(path), { recursive: true });
        const tmp = `${path}.tmp`;
        await writeFile(tmp, JSON.stringify([...rows, appConfigSchema.parse(config)], null, 2), "utf8");
        await rename(tmp, path);
        return true;
      });
      tail = run.catch(() => undefined);
      return run;
    },
    async close() {},
  };
}

/** Stored apps in the `apps` table (migration 0012); the primary key makes the id unique. */
export function createPostgresAppBackend(url: string): AppBackend {
  const pool = new Pool({ connectionString: url, max: 2 });
  let ready: Promise<unknown> | null = null;
  const ensure = () =>
    (ready ??= pool.query("create table if not exists apps (id text primary key, config jsonb not null, created_at timestamptz not null default now())"));
  return {
    kind: "postgres",
    async list() {
      await ensure();
      return (await pool.query<{ config: unknown }>("select config from apps order by created_at, id")).rows.map((r) => r.config);
    },
    async insert(config) {
      await ensure();
      const r = await pool.query("insert into apps (id, config) values ($1, $2::jsonb) on conflict (id) do nothing", [config.id, JSON.stringify(config)]);
      return r.rowCount === 1;
    },
    async close() {
      await pool.end();
    },
  };
}

/** DATABASE_URL wins over AGORA_STATE_FILE (stored next to it as `<file>.apps.json`); with neither, stored apps live in memory only. */
export function appBackendFromEnv(env: { DATABASE_URL?: string; AGORA_STATE_FILE?: string }): AppBackend {
  if (env.DATABASE_URL) return createPostgresAppBackend(env.DATABASE_URL);
  if (env.AGORA_STATE_FILE) return createFileAppBackend(`${env.AGORA_STATE_FILE}.apps.json`);
  return createMemoryBackend();
}
