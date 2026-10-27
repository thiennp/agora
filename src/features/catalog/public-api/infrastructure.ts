import type { AppConfig } from "@/lib/app-config";
import { createForecastService } from "../features/forecast/public-api/infrastructure";
import { createInMemoryItemRepository, createItemService } from "../features/items/public-api/infrastructure";
import type { ItemRepository } from "../features/items/public-api/types";

export { ItemError } from "../features/items/public-api/infrastructure";

/** Facade over items and forecast. Erasing a family removes its items and remembered dismissals (FAM-03). */
export function createCatalogService(deps: {
  app: Pick<AppConfig, "id" | "catalog" | "participant" | "policies">;
  canShare: (familyId: string) => boolean;
  repo?: ItemRepository;
  /** Id generator; tests and the simulation pass a deterministic one. */
  newId?: () => string;
}) {
  const items = createItemService({ app: deps.app, repo: deps.repo ?? createInMemoryItemRepository(), canShare: deps.canShare, newId: deps.newId });
  const forecast = createForecastService({ app: deps.app });
  return {
    items,
    forecast,
    async erase(familyId: string) {
      forecast.erase(familyId);
      await items.erase(familyId);
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
