import { ADMIN_COOKIE, adminTokenOf, isAdminToken } from "@/lib/admin";
import { loadEnv } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import { HttpError } from "./api";
import { getAppStore } from "./apps";
import { getIdentityStore } from "./identity";
import { getProjectStore } from "./projects";
import { STEP_ORDER, type ProjectRecord } from "@/lib/interview";

/** Guessing the admin token gets its own tight limit per address; it is never lifted. */
export const adminLimiter = createRateLimiter({ limit: 8, windowMs: 15 * 60_000 });

export const adminEnabled = () => Boolean(loadEnv().ADMIN_TOKEN);

export function adminTokenValid(token: string | undefined): boolean {
  return isAdminToken(token, loadEnv().ADMIN_TOKEN);
}

/** Throws unless the request carries the platform operator's token. With no `ADMIN_TOKEN` configured the admin area does not exist (404). */
export function requireAdmin(req: Request): void {
  if (!adminEnabled()) throw new HttpError(404, "not_found", "Not found.");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = adminLimiter.check(ip);
  if (!rl.ok) throw new HttpError(429, "rate_limited", `Too many attempts. Try again in ${rl.retryAfterSec} seconds.`);
  if (!adminTokenValid(adminTokenOf(req))) throw new HttpError(401, "unauthenticated", "Admin token required.");
}

export interface AdminAppRow {
  id: string;
  name: string;
  tagline: string;
  region: string;
  members: number;
  hasCreator: boolean;
  firstJoinedAt: string | null;
}

/** Every app created on the platform (stored apps), with counts only: no member names, tokens, recovery codes or content. */
export async function listAdminApps(): Promise<AdminAppRow[]> {
  const apps = await getAppStore().list();
  const ids = getIdentityStore();
  const rows = await Promise.all(
    apps.map(async (a): Promise<AdminAppRow> => {
      const members = await ids.members(a.id);
      const joined = members.map((m) => m.joinedAt).sort();
      return { id: a.id, name: a.name, tagline: a.tagline, region: a.region.name, members: members.length, hasCreator: members.some((m) => m.role === "creator"), firstJoinedAt: joined[0] ?? null };
    }),
  );
  return rows.sort((x, y) => (y.firstJoinedAt ?? "").localeCompare(x.firstJoinedAt ?? ""));
}

export interface AdminProjectRow {
  projectId: string;
  source: ProjectRecord["source"];
  status: "opened" | "in_progress" | "built";
  answered: number;
  of: number;
  createdAt: string;
  updatedAt: string;
  appId?: string;
  answers: ProjectRecord["answers"];
}

/** Every interview, newest activity first: who started creating an app, how far they got and what they said. Answers are the words the person gave; there is no contact detail, name or session. */
export async function listAdminProjects(): Promise<AdminProjectRow[]> {
  return (await getProjectStore().list()).map((p) => ({
    projectId: p.id,
    source: p.source,
    status: p.appId ? "built" : p.answers.length ? "in_progress" : "opened",
    answered: p.answers.length,
    of: STEP_ORDER.length,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    ...(p.appId ? { appId: p.appId } : {}),
    answers: p.answers,
  }));
}

export { ADMIN_COOKIE };
