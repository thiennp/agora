import { describeApp, loadApp, type AppConfig, type AppDescription } from "@/lib/app-config";
import type { Role } from "@/lib/identity";
import { getAppStore } from "./apps";
import { getIdentityStore, isStoredApp, sessionTokenOf } from "./identity";

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

export type AppPageView =
  | { kind: "unknown" }
  | { kind: "demo"; app: AppSummary; description: AppDescription }
  | { kind: "stranger"; app: AppSummary; description: AppDescription }
  | { kind: "member"; app: AppSummary; description: AppDescription }
  | { kind: "creator"; app: AppSummary; description: AppDescription; members: { memberId: string; role: Role; name: string; joinedAt: string }[] };

export type AppSummary = NonNullable<Awaited<ReturnType<typeof appSummaryById>>>;

/**
 * What `/app/{app}` shows to whoever asks (BR-42). The role comes only from the session cookie of that app: a stranger gets the join
 * page (name, purpose, features, rules), a member the member view, the creator the overview with the member list. Repository apps
 * (the demo apps) have no members and get the public page. Never a token, a recovery code or another member's data beyond the creator's list.
 */
export async function appPageView(appId: string, cookieHeader: string | null): Promise<AppPageView> {
  getAppStore();
  let config: AppConfig;
  try {
    config = await loadApp(appId);
  } catch {
    return { kind: "unknown" };
  }
  const app = appSummary(config);
  const description = describeApp(config);
  if (!isStoredApp(appId)) return { kind: "demo", app, description };
  const headers: Record<string, string> = cookieHeader ? { cookie: cookieHeader } : {};
  const who = await getIdentityStore().authenticate(appId, sessionTokenOf(new Request("http://localhost/", { headers }), appId));
  if (!who) return { kind: "stranger", app, description };
  if (who.role === "creator") return { kind: "creator", app, description, members: await getIdentityStore().members(appId) };
  return { kind: "member", app, description };
}
