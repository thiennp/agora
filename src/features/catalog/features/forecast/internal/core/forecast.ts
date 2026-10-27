import { inStage, type AppConfig } from "@/lib/app-config";
import { tracked } from "@/lib/state";

export interface Suggestion {
  /** Stable id so a dismissal sticks: kind, category and stage. */
  id: string;
  kind: "outgrown" | "needed";
  category: string;
  stageId: string;
  /** Plain logistics wording, never advice about development or health (CAT-FOR-02). */
  text: string;
}

type App = Pick<AppConfig, "catalog" | "participant">;

/** Where the participant is in the app's stages, or undefined when the app or profile cannot say. */
export function stageValue(app: App, profile: Record<string, string | number>, now: Date): number | undefined {
  const field = app.catalog.stageField;
  if (field) {
    const v = Number(profile[field]);
    return Number.isFinite(v) ? v : undefined;
  }
  return app.catalog.stageCycle ? now.getMonth() : undefined;
}

/** Suggestions from the app's stage table for the participant's current stage, minus dismissed ones. */
export function forecast(
  app: App,
  profile: Record<string, string | number>,
  now: Date,
  dismissed: ReadonlySet<string> = new Set(),
): Suggestion[] {
  const value = stageValue(app, profile, now);
  if (value === undefined) return [];
  const labels = new Map(app.catalog.categories.map((c) => [c.id, c.label]));
  const out: Suggestion[] = [];
  for (const stage of app.catalog.stages) {
    if (!inStage(stage, value, app.catalog.stageCycle)) continue;
    for (const category of stage.outgrows) {
      out.push({ id: `outgrown:${category}:${stage.id}`, kind: "outgrown", category, stageId: stage.id, text: `You may have spare ${labels.get(category)?.toLowerCase()} to pass on.` });
    }
    for (const category of stage.needs) {
      out.push({ id: `needed:${category}:${stage.id}`, kind: "needed", category, stageId: stage.id, text: `You may be looking for ${labels.get(category)?.toLowerCase()}.` });
    }
  }
  return out.filter((s) => !dismissed.has(s.id));
}

/** Forecast with per-family dismissals remembered. Suggestions never list anything by themselves (CAT-02). */
export function createForecastService(deps: { app: App; now?: () => Date; dismissals?: Map<string, Set<string>> }) {
  const now = deps.now ?? (() => new Date());
  const dismissals = deps.dismissals ?? tracked("catalog.dismissals", new Map<string, Set<string>>());
  return {
    suggest(familyId: string, profile: Record<string, string | number>): Suggestion[] {
      return forecast(deps.app, profile, now(), dismissals.get(familyId));
    },
    dismiss(familyId: string, suggestionId: string): void {
      const set = dismissals.get(familyId) ?? new Set<string>();
      set.add(suggestionId);
      dismissals.set(familyId, set);
    },
    erase(familyId: string): void {
      dismissals.delete(familyId);
    },
  };
}
