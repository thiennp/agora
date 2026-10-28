import { afterEach, describe, expect, it } from "vitest";
import { ALWAYS_ASK_TOPICS, AppStoreError, MAX_STORED_APPS, createAppStore, createMemoryBackend, loadApp, registerAppStore, repoAppIds, type AppConfig } from "./index";

const base = async (id: string): Promise<AppConfig> => ({ ...(await loadApp("garden-tools")), id, name: `App ${id}` });
const fresh = () => createAppStore(createMemoryBackend(), { reserved: repoAppIds() });
const code = async (p: Promise<unknown>) => ((await p.then(() => null, (e: unknown) => e)) as AppStoreError | null)?.code;

afterEach(() => registerAppStore(undefined));

describe("app store (apps as data, BR-41)", () => {
  it("stores a valid config and returns it by id and in the list", async () => {
    const store = fresh();
    const cfg = await base("friends-clothes");
    expect((await store.create(cfg)).id).toBe("friends-clothes");
    expect(await store.get("friends-clothes")).toEqual(cfg);
    expect((await store.list()).map((a) => a.id)).toEqual(["friends-clothes"]);
    expect(await store.get("nope")).toBeUndefined();
  });

  it("rejects an invalid config and stores nothing", async () => {
    const store = fresh();
    const cfg = await base("bad-app");
    for (const topic of ALWAYS_ASK_TOPICS) {
      const bad = { ...cfg, policies: { ...cfg.policies, topics: { ...cfg.policies.topics, [topic]: "auto" } } };
      expect(await code(store.create(bad))).toBe("invalid_app");
    }
    expect(await code(store.create({ id: "half-an-app" }))).toBe("invalid_app");
    expect(await code(store.create("nope"))).toBe("invalid_app");
    expect(await store.list()).toEqual([]);
  });

  it("rejects ids that are malformed, reserved or a repository app's", async () => {
    const store = fresh();
    expect(await code(store.create(await base("ab")))).toBe("invalid_app");
    expect(await code(store.create(await base("x".repeat(41))))).toBe("invalid_app");
    expect(await code(store.create(await base("garden-tools")))).toBe("reserved_id");
    expect(await code(store.create(await base("kids-gear")))).toBe("reserved_id");
    expect(await code(store.create(await base("muse")))).toBe("reserved_id");
  });

  it("keeps ids unique, even for two creates at once", async () => {
    const store = fresh();
    const results = await Promise.all([store.create(await base("one-name")), store.create(await base("one-name"))].map((p) => code(p)));
    expect(results.filter((c) => c === "app_exists")).toHaveLength(1);
    expect(await store.list()).toHaveLength(1);
  });

  it("refuses a sandbox path that leaves the app", async () => {
    const store = fresh();
    for (const cityDir of ["../../etc", "/etc", "a/../../b"]) {
      const cfg = await base("path-app");
      expect(await code(store.create({ ...cfg, simulation: { cityDir } }))).toBe("invalid_app");
    }
  });

  it("validates again when reading, so a tampered row is not served", async () => {
    const backend = createMemoryBackend();
    const store = createAppStore(backend);
    const cfg = await base("tampered");
    await backend.insert({ ...cfg, policies: { ...cfg.policies, topics: { ...cfg.policies.topics, commitment: "auto" } } } as AppConfig);
    expect(await code(store.get("tampered"))).toBe("invalid_app");
  });

  it("caps how many apps can be stored", async () => {
    const backend = createMemoryBackend();
    const cfg = await base("seed-app");
    for (let i = 0; i < MAX_STORED_APPS; i++) await backend.insert({ ...cfg, id: `filler-${i}` });
    expect(await code(createAppStore(backend).create(await base("one-too-many")))).toBe("too_many_apps");
  });

  it("loadApp finds a stored app once a store is registered, and repository apps win", async () => {
    const store = fresh();
    await store.create(await base("stored-one"));
    await expect(loadApp("stored-one")).rejects.toThrow(/Unknown app/);
    registerAppStore(store);
    expect((await loadApp("stored-one")).name).toBe("App stored-one");
    expect((await loadApp("kids-gear")).id).toBe("kids-gear");
    await expect(loadApp("toString")).rejects.toThrow(/Unknown app/);
  });
});
