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

export async function loadApp(id: string = process.env.APP ?? DEFAULT_APP): Promise<AppConfig> {
  const load = registry[id];
  if (!load) {
    throw new Error(`Unknown app "${id}". Registered: ${Object.keys(registry).join(", ")}`);
  }
  return (await load()).default;
}
