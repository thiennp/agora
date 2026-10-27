import { loadEnv } from "@/lib/env";

export function GET() {
  const { MODE } = loadEnv();
  return Response.json({ ok: true, mode: MODE });
}
