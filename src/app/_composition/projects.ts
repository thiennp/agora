import { createProjectStore, type ProjectStore } from "@/lib/interview";
import { loadEnv } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import { createFileBackend, createPostgresBackend } from "./persistence";

const g = globalThis as unknown as { __agoraProjects?: ProjectStore };

/** Same backend choice as identity: DATABASE_URL (row `projects` of `app_state`), else `<AGORA_STATE_FILE>.projects.json`, else memory. */
export function getProjectStore(): ProjectStore {
  if (g.__agoraProjects) return g.__agoraProjects;
  const env = loadEnv();
  const backend = env.DATABASE_URL ? createPostgresBackend(env.DATABASE_URL, "projects") : env.AGORA_STATE_FILE ? createFileBackend(`${env.AGORA_STATE_FILE}.projects.json`) : undefined;
  return (g.__agoraProjects = createProjectStore(backend));
}

/** Replace the store (tests). */
export function useProjectStore(store: ProjectStore | undefined): void {
  g.__agoraProjects = store;
}

/** Opening a project stores a row, so it is limited per address like a build. */
export const projectOpenLimiter = createRateLimiter({ limit: 20, windowMs: 60_000, liftable: true });
export const resetProjectLimits = () => projectOpenLimiter.reset();
