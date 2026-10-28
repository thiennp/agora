import { createIdentityStore, IdentityError, type IdentityBackend, type IdentityStore, type Principal, type Role } from "@/lib/identity";
import { createFileBackend, createPostgresBackend } from "./persistence";
import { loadEnv } from "@/lib/env";
import { repoAppIds } from "@/lib/app-config";

/** Shown wherever a person gets a membership: what this is and is not (BR-45). */
export const LIGHT_IDENTITY_NOTICE =
  "This is light identity, not a real account. Your phone holds a private session, and the recovery code is the only way back in on a new phone. Anyone who has the code is you. Keep it somewhere safe and do not share it or post it.";

const g = globalThis as unknown as { __agoraIdentity?: IdentityStore };

/** Same backend choice as the apps: DATABASE_URL (row `identity` of `app_state`), else `<AGORA_STATE_FILE>.identity.json`, else memory. */
function backendFromEnv(env: { DATABASE_URL?: string; AGORA_STATE_FILE?: string }): IdentityBackend | undefined {
  if (env.DATABASE_URL) return createPostgresBackend(env.DATABASE_URL, "identity");
  if (env.AGORA_STATE_FILE) return createFileBackend(`${env.AGORA_STATE_FILE}.identity.json`);
  return undefined;
}

export function getIdentityStore(): IdentityStore {
  return (g.__agoraIdentity ??= createIdentityStore(backendFromEnv(loadEnv())));
}

/** Replace the store (tests). */
export function useIdentityStore(store: IdentityStore | undefined): void {
  g.__agoraIdentity = store;
}

/** Repository apps (the demo apps) run on the two built-in personas; only stored apps have members of their own. */
export const isStoredApp = (appId: string) => !repoAppIds().includes(appId);

const cookieName = (appId: string) => `agora_s_${appId}`;

/** The session token a request carries. Only a cookie: a token in a URL or body would leak through screenshots and forwarded links. */
export function sessionTokenOf(req: Request, appId: string): string | undefined {
  const name = cookieName(appId);
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim() || undefined;
  }
  return undefined;
}

const secure = (req: Request) => new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

/** HttpOnly (scripts cannot read it), SameSite=Lax (a cross-site form post does not carry it), Secure over https, 30 days. */
export function sessionCookie(req: Request, appId: string, token: string | null): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") || "/";
  const flags = `Path=${base}; HttpOnly; SameSite=Lax${secure(req) ? "; Secure" : ""}`;
  return token === null ? `${cookieName(appId)}=; ${flags}; Max-Age=0` : `${cookieName(appId)}=${token}; ${flags}; Max-Age=${30 * 24 * 3600}`;
}

/** Who is asking, for this app. Throws `unauthenticated` for a missing, forged, expired or other-app session. */
export async function authorize(req: Request, appId: string, role?: Role): Promise<Principal> {
  const p = await getIdentityStore().authenticate(appId, sessionTokenOf(req, appId));
  if (!p) throw new IdentityError("unauthenticated", "Open this app from your own phone, or recover your access with your recovery code.");
  if (role && p.role !== role) throw new IdentityError("forbidden", "Only the app's creator can do this.");
  return p;
}
