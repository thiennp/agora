import { z } from "zod";
import type { AppConfig } from "@/lib/app-config";

/** FAM-05: the platform collects no health, sleep or feeding data, whatever an app asks for. */
const HEALTH_WORDS = /(health|sleep|feeding|feed|diet|medical|diagnos|illness|weight|allerg)/i;

function assertNoHealthFields(app: Pick<AppConfig, "participant">): void {
  for (const f of app.participant.fields) {
    if (HEALTH_WORDS.test(f.id) || HEALTH_WORDS.test(f.label)) {
      throw new Error(`profile field "${f.id}" looks like health data, which the platform does not collect`);
    }
  }
}

const district = z.union([
  z.object({ lat: z.number(), lon: z.number() }).strict(),
  z.object({ name: z.string().min(1).max(80) }).strict(),
]);

/** Builds the input schema for one app from its participant fields: every field required, no extras. */
export function buildProfileSchema(app: Pick<AppConfig, "participant" | "policies">) {
  assertNoHealthFields(app);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of app.participant.fields) {
    shape[f.id] =
      f.type === "number"
        ? z.number().finite().min(0).max(1000)
        : z.string().trim().min(1).max(200);
  }
  const languages = app.policies.languages as [string, ...string[]];
  return z
    .object({
      language: z.enum(languages),
      district,
      profile: z.object(shape).strict(),
    })
    .strict();
}
