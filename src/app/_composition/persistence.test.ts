import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { backendFromEnv, createFileBackend, createPostgresBackend, type StateBackend } from "./persistence";

const roundTrip = async (b: StateBackend) => {
  await b.clear();
  expect(await b.load()).toBeNull();
  await b.save('{"a":{"$map":[["k",1]]}}');
  await b.save('{"a":{"$map":[["k",2]]}}');
  expect(JSON.parse((await b.load())!)).toEqual({ a: { $map: [["k", 2]] } });
  await b.clear();
  expect(await b.load()).toBeNull();
};

describe("state backends", () => {
  const dirs: string[] = [];
  afterAll(async () => void (await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))));

  it("file: saves, replaces, loads and clears", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agora-be-"));
    dirs.push(dir);
    await roundTrip(createFileBackend(join(dir, "nested", "s.json")));
  });

  it("picks the backend from the environment: Postgres first, then a file, else memory only", () => {
    expect(backendFromEnv({})).toBeNull();
    expect(backendFromEnv({ AGORA_STATE_FILE: "/tmp/x.json" })?.kind).toBe("file");
    const pg = backendFromEnv({ DATABASE_URL: "postgres://u@localhost/x", AGORA_STATE_FILE: "/tmp/x.json" });
    expect(pg?.kind).toBe("postgres");
    void pg?.close();
  });

  // Runs under `npm run db:check`, which starts a Postgres and sets TEST_DATABASE_URL.
  it.skipIf(!process.env.TEST_DATABASE_URL)("postgres: saves, replaces, loads and clears", async () => {
    const b = createPostgresBackend(process.env.TEST_DATABASE_URL!);
    try {
      await roundTrip(b);
    } finally {
      await b.close();
    }
  });
});
