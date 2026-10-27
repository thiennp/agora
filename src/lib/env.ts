import { z } from "zod";

const schema = z.object({
  MODE: z.enum(["mock", "live"]).default("mock"),
  DATABASE_URL: z.string().optional(),
  META_API_KEY: z.string().optional(),
  AGENTWITCH_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = schema.parse(source);
  if (env.MODE === "live" && !env.META_API_KEY) {
    throw new Error("MODE=live requires META_API_KEY");
  }
  return env;
}
