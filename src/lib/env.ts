import { z } from "zod";

const schema = z.object({
  /** Named AGORA_MODE because a bare MODE collides with other tools (Vite and Vitest set MODE themselves). */
  AGORA_MODE: z.enum(["mock", "live"]).default("mock"),
  DATABASE_URL: z.string().optional(),
  META_API_KEY: z.string().optional(),
  AGENTWITCH_URL: z.string().url().optional(),
  META_API_URL: z.string().url().optional(),
  OPEN_MODEL_HOST: z.enum(["baseten", "modal"]).optional(),
  OPEN_MODEL_URL: z.string().url().optional(),
  OPEN_MODEL_KEY: z.string().optional(),
  FIELD_ENCRYPTION_SECRET: z.string().min(16).optional(),
  REPORT_EXPORT_SECRET: z.string().min(16).optional(),
  /** Photo intake in the demo: `simulated` (offline, no model looks at the photo) or `meta` (Muse Spark vision and SAM 3.1; needs META_API_KEY). */
  AGORA_INTAKE: z.enum(["simulated", "meta"]).default("simulated"),
  APP: z.string().default("kids-gear"),
  /** Demo state is saved here between restarts when DATABASE_URL is empty. */
  AGORA_STATE_FILE: z.string().optional(),
});

type Parsed = z.infer<typeof schema>;
/** The settings the code uses; `MODE` is the value of the AGORA_MODE variable. */
export type Env = Omit<Parsed, "AGORA_MODE"> & { MODE: Parsed["AGORA_MODE"] };

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const { AGORA_MODE, ...rest } = schema.parse(source);
  const env: Env = { ...rest, MODE: AGORA_MODE };
  if (env.AGORA_INTAKE === "meta" && !env.META_API_KEY) {
    throw new Error("AGORA_INTAKE=meta requires META_API_KEY");
  }
  if (env.MODE === "live" && !env.META_API_KEY) {
    throw new Error("AGORA_MODE=live requires META_API_KEY");
  }
  if (env.MODE === "live" && (!env.FIELD_ENCRYPTION_SECRET || !env.REPORT_EXPORT_SECRET)) {
    throw new Error("AGORA_MODE=live requires FIELD_ENCRYPTION_SECRET and REPORT_EXPORT_SECRET (at least 16 characters each)");
  }
  return env;
}
