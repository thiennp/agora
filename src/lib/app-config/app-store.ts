import { appConfigSchema, type AppConfig } from "./schema";

/**
 * Apps as data (BR-41): an app config stored by the platform instead of an `apps/<id>/` folder. Every config is validated by
 * `appConfigSchema` before it is stored and again when it is read back, so the always-ask rules cannot be relaxed by data either.
 */
export type AppStoreErrorCode = "invalid_app" | "reserved_id" | "app_exists" | "too_many_apps";

export class AppStoreError extends Error {
  constructor(readonly code: AppStoreErrorCode, message: string) {
    super(message);
  }
}

/** Where stored apps live. `insert` must refuse a taken id atomically (a unique key), so two requests cannot both win. */
export interface AppBackend {
  kind: "memory" | "file" | "postgres";
  list(): Promise<unknown[]>;
  /** False when the id is already taken. */
  insert(config: AppConfig): Promise<boolean>;
  close(): Promise<void>;
}

export interface AppStore {
  create(config: unknown): Promise<AppConfig>;
  get(id: string): Promise<AppConfig | undefined>;
  list(): Promise<AppConfig[]>;
}

export const MAX_STORED_APPS = 200;
const ID = /^[a-z][a-z0-9-]{2,39}$/;
/** Words that would clash with platform routes or read as the platform itself. */
const RESERVED_WORDS = ["new", "api", "admin", "start", "demo", "muse", "agora", "join", "docs", "styleguide"];

export function createMemoryBackend(): AppBackend {
  const rows = new Map<string, AppConfig>();
  return {
    kind: "memory",
    async list() {
      return [...rows.values()];
    },
    async insert(config) {
      if (rows.has(config.id)) return false;
      rows.set(config.id, config);
      return true;
    },
    async close() {},
  };
}

/** `reserved` are ids that exist elsewhere (the repository apps), so a stored app can never shadow one. */
export function createAppStore(backend: AppBackend, opts: { reserved?: string[] } = {}): AppStore {
  const reserved = new Set([...RESERVED_WORDS, ...(opts.reserved ?? [])]);
  const parse = (raw: unknown): AppConfig => {
    const r = appConfigSchema.safeParse(raw);
    if (!r.success) throw new AppStoreError("invalid_app", r.error.issues.map((i) => `${i.path.join(".") || "app"}: ${i.message}`).join("; "));
    const cfg = r.data;
    if (!ID.test(cfg.id)) throw new AppStoreError("invalid_app", "id: use 3 to 40 lowercase letters, digits or dashes, starting with a letter");
    // A stored app has no folder: its sandbox path must never point outside one.
    if (/(^|[\\/])\.\.([\\/]|$)|^[\\/]/.test(cfg.simulation.cityDir)) throw new AppStoreError("invalid_app", "simulation.cityDir: must be a relative path inside the app");
    return cfg;
  };
  return {
    async create(raw) {
      const cfg = parse(raw);
      if (reserved.has(cfg.id)) throw new AppStoreError("reserved_id", `The app id "${cfg.id}" is reserved.`);
      if ((await backend.list()).length >= MAX_STORED_APPS) throw new AppStoreError("too_many_apps", "This platform has reached its limit of stored apps.");
      if (!(await backend.insert(cfg))) throw new AppStoreError("app_exists", `The app id "${cfg.id}" is taken.`);
      return cfg;
    },
    async get(id) {
      const row = (await backend.list()).find((r) => (r as { id?: unknown })?.id === id);
      return row === undefined ? undefined : parse(row);
    },
    async list() {
      return (await backend.list()).map(parse);
    },
  };
}

const g = globalThis as unknown as { __agoraAppStore?: AppStore };

/** The store `loadApp` falls back to. The entry layer registers it once at start (it picks the backend from the environment). */
export function registerAppStore(store: AppStore | undefined): void {
  g.__agoraAppStore = store;
}

export function registeredAppStore(): AppStore | undefined {
  return g.__agoraAppStore;
}
