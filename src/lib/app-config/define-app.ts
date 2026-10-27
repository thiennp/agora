import { appConfigSchema, type AppConfig } from "./schema";

/** Validate and return an app config. Apps call this in their `app.config.ts`. */
export function defineApp(config: unknown): AppConfig {
  return appConfigSchema.parse(config);
}
