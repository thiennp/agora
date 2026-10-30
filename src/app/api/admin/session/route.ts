import { ADMIN_COOKIE, adminEnabled, adminLimiter, adminTokenValid } from "@/app/_composition/admin";

export const dynamic = "force-dynamic";

const base = () => process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Sign in as the operator from the /admin/apps form: a right token sets an HttpOnly cookie, then back to the page. The token is never put in a URL. */
export async function POST(req: Request): Promise<Response> {
  const back = (error?: string) => new Response(null, { status: 303, headers: { location: `${base()}/admin/apps${error ? `?error=${error}` : ""}` } });
  if (!adminEnabled()) return new Response("Not found.", { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!adminLimiter.check(ip).ok) return back("limit");
  const token = String((await req.formData().catch(() => null))?.get("token") ?? "");
  if (!adminTokenValid(token)) return back("wrong");
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const headers = new Headers({ location: `${base()}/admin/apps` });
  headers.append("set-cookie", `${ADMIN_COOKIE}=${token}; Path=${base() || "/"}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}; Max-Age=${8 * 3600}`);
  return new Response(null, { status: 303, headers });
}
