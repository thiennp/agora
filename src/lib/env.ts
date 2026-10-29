import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().optional(),
  META_API_KEY: z.string().optional(),
  AGENTWITCH_URL: z.string().url().optional(),
  META_API_URL: z.string().url().optional(),
  OPEN_MODEL_HOST: z.enum(["baseten", "modal"]).optional(),
  OPEN_MODEL_URL: z.string().url().optional(),
  OPEN_MODEL_KEY: z.string().optional(),
  FIELD_ENCRYPTION_SECRET: z.string().min(16).optional(),
  REPORT_EXPORT_SECRET: z.string().min(16).optional(),
  /** The app the simulation and the dashboard's city map use. */
  APP: z.string().default("kids-gear"),
  /** Saved state goes here between restarts when DATABASE_URL is empty (development). */
  AGORA_STATE_FILE: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return schema.parse(source);
}

/** What a running app needs: the Meta key (translation, photo intake) and the two secrets that encrypt addresses and sign report exports. Fails by name, never falls back to a fake. */
export function requireRuntimeEnv(env: Env = loadEnv()): Env & { META_API_KEY: string; FIELD_ENCRYPTION_SECRET: string; REPORT_EXPORT_SECRET: string } {
  const missing = (["META_API_KEY", "FIELD_ENCRYPTION_SECRET", "REPORT_EXPORT_SECRET"] as const).filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing ${missing.join(", ")}: the app needs a real Meta key and its two secrets (at least 16 characters each).`);
  return env as Env & { META_API_KEY: string; FIELD_ENCRYPTION_SECRET: string; REPORT_EXPORT_SECRET: string };
}
