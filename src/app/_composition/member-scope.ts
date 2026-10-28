import { appVocabulary, loadApp } from "@/lib/app-config";
import type { Scope } from "@/components/scope";
import { getAppStore } from "./apps";
import { getIdentityStore, isStoredApp, sessionTokenOf } from "./identity";
import { getPlatform, type Platform } from "./platform";

/**
 * Who is using a created app, and the app's platform seen as them (BR-42, BR-45, docs/PLAN.md §2c-quater). The person comes only from the
 * session cookie of that app. The platform is the app's own (its stores and saved state), with both persona keys resolving to that one
 * member, the same rule the API routes apply, so the demo views and components run unchanged for a created app and nobody can act as
 * someone else. A repository app, an unknown app and a person without a session for this app all give `none`: the pages answer 404 and
 * never reveal whether the app or the member exists beyond the public page.
 */
export type MemberScope =
  | { kind: "none" }
  | { kind: "member"; platform: Platform; scope: Scope; me: { id: string; name: string; role: "creator" | "member" } };

export async function memberScope(appId: string, cookieHeader: string): Promise<MemberScope> {
  getAppStore();
  try {
    await loadApp(appId);
  } catch {
    return { kind: "none" };
  }
  if (!isStoredApp(appId)) return { kind: "none" };
  const headers: Record<string, string> = cookieHeader ? { cookie: cookieHeader } : {};
  const who = await getIdentityStore().authenticate(appId, sessionTokenOf(new Request("http://localhost/", { headers }), appId));
  if (!who) return { kind: "none" };
  const base = await getPlatform(appId);
  const persona = base.byId.get(who.memberId);
  if (!persona) return { kind: "none" };
  const name = (await getIdentityStore().members(appId)).find((m) => m.memberId === who.memberId)?.name ?? "";
  const platform: Platform = { ...base, personas: { a: persona, b: persona } };
  return { kind: "member", platform, scope: { app: appId, as: "a", words: appVocabulary(base.app) }, me: { id: who.memberId, name, role: who.role } };
}
