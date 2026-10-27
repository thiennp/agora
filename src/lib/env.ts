import { z } from "zod";

const schema = z.object({
  MODE: z.enum(["mock", "live"]).default("mock"),
  DATABASE_URL: z.string().optional(),
  META_API_KEY: z.string().optional(),
  AGENTWITCH_URL: z.string().url().optional(),
  META_API_URL: z.string().url().optional(),
  OPEN_MODEL_HOST: z.enum(["baseten", "modal"]).optional(),
  OPEN_MODEL_URL: z.string().url().optional(),
  OPEN_MODEL_KEY: z.string().optional(),
  FIELD_ENCRYPTION_SECRET: z.string().min(16).optional(),
  REPORT_EXPORT_SECRET: z.string().min(16).optional(),
  APP: z.string().default("kids-gear"),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = schema.parse(source);
  if (env.MODE === "live" && !env.META_API_KEY) {
    throw new Error("MODE=live requires META_API_KEY");
  }
  if (env.MODE === "live" && (!env.FIELD_ENCRYPTION_SECRET || !env.REPORT_EXPORT_SECRET)) {
    throw new Error("MODE=live requires FIELD_ENCRYPTION_SECRET and REPORT_EXPORT_SECRET (at least 16 characters each)");
  }
  return env;
}
