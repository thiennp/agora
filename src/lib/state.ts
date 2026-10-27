/**
 * Tracked state: stores register their in-memory containers (Map, Set, array or plain object) under a name, so the
 * whole platform can be written out as one document and read back after a restart. A store calls `tracked(name, value)`
 * where it creates the container; outside a scope (the simulation, most tests) it returns the value unchanged.
 * Restoring refills the same container objects in place, so code holding a reference keeps working.
 */
type Container = object;

export interface StateScope {
  track<T extends Container>(name: string, value: T): T;
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
  const seen = new Map<string, number>();
  return {
    track(name, value) {
      // The same factory can run twice in one scope; the second gets "name#2" so names stay stable in creation order.
      const n = (seen.get(name) ?? 0) + 1;
      seen.set(name, n);
      items.set(n === 1 ? name : `${name}#${n}`, value);
      return value;
    },
    snapshot() {
      return JSON.stringify(Object.fromEntries(items), encode);
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

export function tracked<T extends Container>(name: string, value: T): T {
  return active ? active.track(name, value) : value;
}
