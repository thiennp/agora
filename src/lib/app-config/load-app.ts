import { registeredAppStore } from "./app-store";
import type { AppConfig } from "./schema";

/**
 * The only place platform code reaches into `apps/`. Apps are registered here so the
 * bundler sees every import; `APP` selects which one is active.
 */
const registry: Record<string, () => Promise<{ default: AppConfig }>> = {
  "kids-gear": () => import("../../../apps/kids-gear/app.config"),
  "garden-tools": () => import("../../../apps/garden-tools/app.config"),
};

export const DEFAULT_APP = "kids-gear";

/** Ids of the apps that live in the repository. Stored apps may not reuse them. */
export const repoAppIds = (): string[] => Object.keys(registry);

/** A repository app first, then a stored one (apps as data). Unknown ids throw. */
export async function loadApp(id: string = process.env.APP ?? DEFAULT_APP): Promise<AppConfig> {
  const load = Object.hasOwn(registry, id) ? registry[id] : undefined;
  if (load) return (await load()).default;
  const stored = await registeredAppStore()?.get(id);
  if (stored) return stored;
  throw new Error(`Unknown app "${id}". Registered: ${repoAppIds().join(", ")}`);
}
