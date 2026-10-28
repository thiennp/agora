/**
 * Tracked state: stores register their in-memory containers (Map, Set, array or plain object) under a name, so the
 * whole platform can be written out as one document and read back after a restart. A store calls `tracked(name, value)`
 * where it creates the container; outside a scope (the simulation, most tests) it returns the value unchanged.
 * Restoring refills the same container objects in place, so code holding a reference keeps working.
 */
type Container = object;

export interface TrackOptions {
  /** When saving, write the value of the second field in place of the first (`{ original: "screenedOriginal" }`), so a field that must stay in memory never reaches the saved copy. */
  swap?: Record<string, string>;
}

export interface StateScope {
  track<T extends Container>(name: string, value: T, opts?: TrackOptions): T;
  snapshot(): string;
  restore(json: string): void;
  names(): string[];
}

const encode = (_k: string, v: unknown): unknown => {
  if (v instanceof Map) return { $map: [...v.entries()] };
  if (v instanceof Set) return { $set: [...v.values()] };
  return v;
};

const decode = (_k: string, v: unknown): unknown => {
  if (v && typeof v === "object") {
    if ("$map" in v) return new Map((v as { $map: [unknown, unknown][] }).$map);
    if ("$set" in v) return new Set((v as { $set: unknown[] }).$set);
  }
  return v;
};

function refill(target: Container, source: unknown): void {
  if (target instanceof Map) {
    target.clear();
    for (const [k, v] of source as Map<unknown, unknown>) target.set(k, v);
  } else if (target instanceof Set) {
    target.clear();
    for (const v of source as Set<unknown>) target.add(v);
  } else if (Array.isArray(target)) {
    target.length = 0;
    target.push(...(source as unknown[]));
  } else {
    const o = target as Record<string, unknown>;
    for (const k of Object.keys(o)) delete o[k];
    Object.assign(o, source);
  }
}

export function createStateScope(): StateScope {
  const items = new Map<string, Container>();
  const options = new Map<string, TrackOptions>();
  const seen = new Map<string, number>();
  return {
    track(name, value, opts) {
      // The same factory can run twice in one scope; the second gets "name#2" so names stay stable in creation order.
      const n = (seen.get(name) ?? 0) + 1;
      seen.set(name, n);
      const key = n === 1 ? name : `${name}#${n}`;
      items.set(key, value);
      if (opts) options.set(key, opts);
      return value;
    },
    snapshot() {
      const parts = [...items].map(([name, value]) => {
        const swap = options.get(name)?.swap;
        const replacer = swap
          ? function (this: unknown, k: string, v: unknown) {
              const from = swap[k];
              if (from !== undefined && this && typeof this === "object" && from in this) return encode(k, (this as Record<string, unknown>)[from]);
              return encode(k, v);
            }
          : encode;
        return `${JSON.stringify(name)}:${JSON.stringify(value, replacer)}`;
      });
      return `{${parts.join(",")}}`;
    },
    restore(json) {
      const data = JSON.parse(json, decode) as Record<string, unknown>;
      for (const [name, target] of items) if (name in data) refill(target, data[name]);
    },
    names: () => [...items.keys()],
  };
}

let active: StateScope | null = null;

/** Containers created while `fn` runs synchronously are tracked in `scope`. */
export function withScope<T>(scope: StateScope, fn: () => T): T {
  const before = active;
  active = scope;
  try {
    return fn();
  } finally {
    active = before;
  }
}

/** Like `withScope` for code that cannot be wrapped in one callback; call the returned function to leave the scope. */
export function enterScope(scope: StateScope): () => void {
  const before = active;
  active = scope;
  return () => {
    active = before;
  };
}

export function tracked<T extends Container>(name: string, value: T, opts?: TrackOptions): T {
  return active ? active.track(name, value, opts) : value;
}
