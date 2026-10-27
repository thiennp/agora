import type { AppConfig } from "./schema";

type Stage = AppConfig["catalog"]["stages"][number];

/** True when `value` falls in the stage's range `[from, to)`, wrapping around the cycle when `from > to`. */
export function inStage(stage: Pick<Stage, "from" | "to">, value: number, cycle?: number): boolean {
  const v = cycle ? ((value % cycle) + cycle) % cycle : value;
  return stage.from <= stage.to ? v >= stage.from && v < stage.to : v >= stage.from || v < stage.to;
}

/** First forbidden-item rule whose keyword appears in `text`, or undefined. */
export function findForbiddenItem(app: Pick<AppConfig, "policies">, text: string) {
  const t = text.toLowerCase();
  return app.policies.forbiddenItems.find((f) => f.keywords.some((k) => t.includes(k.toLowerCase())));
}
