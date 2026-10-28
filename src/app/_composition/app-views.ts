import { loadApp, type AppConfig } from "@/lib/app-config";
import { getAppStore } from "./apps";

/** The public face of an app: enough for a join page, nothing about its members or data (BR-42). */
export function appSummary(app: AppConfig) {
  return { id: app.id, name: app.name, tagline: app.tagline, region: app.region.name, participant: app.participant.noun, languages: app.policies.languages };
}

export async function appSummaryById(id: string) {
  getAppStore();
  try {
    return appSummary(await loadApp(id));
  } catch {
    return undefined;
  }
}
