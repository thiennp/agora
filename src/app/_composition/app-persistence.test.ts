import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createAppStore, loadApp, type AppBackend } from "@/lib/app-config";
import { appBackendFromEnv, createFileAppBackend, createPostgresAppBackend } from "./app-persistence";

const roundTrip = async (b: AppBackend, id: string) => {
  const store = createAppStore(b);
  const cfg = { ...(await loadApp("garden-tools")), id, name: "Stored" };
  await store.create(cfg);
  expect(await store.get(id)).toEqual(cfg);
  expect(await b.insert(cfg)).toBe(false);
};

describe("stored app backends", () => {
  const dirs: string[] = [];
  afterAll(async () => void (await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))));

  it("file: keeps apps across a new backend on the same path, and ids stay unique", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agora-apps-"));
    dirs.push(dir);
    const path = join(dir, "nested", "apps.json");
    await roundTrip(createFileAppBackend(path), "file-app");
    expect((await createAppStore(createFileAppBackend(path)).list()).map((a) => a.id)).toEqual(["file-app"]);
    const b = createFileAppBackend(path);
    const cfg = await loadApp("garden-tools");
    const both = await Promise.all([b.insert({ ...cfg, id: "race-app" }), b.insert({ ...cfg, id: "race-app" })]);
    expect(both.filter(Boolean)).toHaveLength(1);
  });

  it("picks the backend from the environment: Postgres, then a file next to the state file, else memory", () => {
    expect(appBackendFromEnv({}).kind).toBe("memory");
    expect(appBackendFromEnv({ AGORA_STATE_FILE: "/tmp/x.json" }).kind).toBe("file");
    const pg = appBackendFromEnv({ DATABASE_URL: "postgres://u@localhost/x", AGORA_STATE_FILE: "/tmp/x.json" });
    expect(pg.kind).toBe("postgres");
    void pg.close();
  });

  // Runs under `npm run db:check`, which starts a Postgres and sets TEST_DATABASE_URL.
  it.skipIf(!process.env.TEST_DATABASE_URL)("postgres: stores, reads back and refuses a taken id", async () => {
    const b = createPostgresAppBackend(process.env.TEST_DATABASE_URL!);
    try {
      await roundTrip(b, `pg-app-${Date.now()}`);
    } finally {
      await b.close();
    }
  });
});
