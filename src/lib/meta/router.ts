import type { ModelId, Provider, Role } from "./types";

export interface Route {
  model: ModelId;
  provider: Provider;
}

/** Default table; reasoning-heavy roles use the API model, cheap structured roles use the open model. */
export const DEFAULT_ROUTES: Record<Role, ModelId> = {
  intake: "muse-spark",
  forecaster: "muse-spark-open",
  matcher: "muse-spark-open",
  negotiator: "muse-spark",
  translator: "muse-spark",
  lessons: "muse-spark-open",
  logistics: "muse-spark",
  trust: "muse-spark-open",
};

export type RoutingOverrides = Partial<Record<Role, ModelId>>;

/** Routing is configuration (LIB-META-02): overrides let benchmarks swap models per role. */
export function createRouter(opts: {
  overrides?: RoutingOverrides;
  /** Which provider serves each model. */
  providers: Record<ModelId, Provider>;
}) {
  return {
    routeFor(role: Role): Route {
      const model = opts.overrides?.[role] ?? DEFAULT_ROUTES[role];
      return { model, provider: opts.providers[model] };
    },
  };
}

export type Router = ReturnType<typeof createRouter>;
