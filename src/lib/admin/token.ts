import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "agora_admin";

/** Compares hashes, so the check takes the same time whatever the guess and its length. */
export function isAdminToken(given: string | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(expected));
}

/** The token a request carries: `Authorization: Bearer …`, else the admin cookie. Never a URL parameter. */
export function adminTokenOf(req: Request): string | undefined {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim() || undefined;
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === ADMIN_COOKIE) return part.slice(i + 1).trim() || undefined;
  }
  return undefined;
}
