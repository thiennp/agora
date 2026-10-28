import { AppStoreError, type AppConfig } from "@/lib/app-config";
import { loadEnv } from "@/lib/env";
import { advance, createInterviewModel, InterviewError, validateDraft, type InterviewModel } from "@/lib/interview";
import { createMetaClientFromEnv } from "@/lib/meta";
import { getAppStore } from "./apps";
import { LIGHT_IDENTITY_NOTICE, getIdentityStore, sessionCookie } from "./identity";
import { appSummary } from "./app-views";
import { Reply } from "./api";
import { createRateLimiter } from "@/lib/rate-limit";

const g = globalThis as unknown as { __agoraInterviewModel?: InterviewModel };

/**
 * The interviewer's model: Muse Spark in live mode, the offline mock otherwise. The mock answers nothing useful, so in mock mode
 * the interview runs on code alone (static examples, code-drafted app), which is what tests and offline demos see.
 */
export function getInterviewModel(): InterviewModel {
  if (g.__agoraInterviewModel) return g.__agoraInterviewModel;
  // The client is bound to an app for its preamble; before an app exists it is a neutral placeholder.
  const placeholder = {
    id: "interview", name: "Agora", region: { name: "Anywhere" }, participant: { noun: "person", fields: [] },
    policies: { languages: ["en"], pricing: { mode: "free_or_agreement" } },
  } as unknown as Parameters<typeof createMetaClientFromEnv>[0];
  const env = loadEnv();
  return (g.__agoraInterviewModel = createInterviewModel(createMetaClientFromEnv(placeholder, env)));
}

/** Replace the model (tests). */
export function useInterviewModel(model: InterviewModel | undefined): void {
  g.__agoraInterviewModel = model;
}

export const runInterview = (answers: Parameters<typeof advance>[0]) => advance(answers, getInterviewModel());

/**
 * Create an app from a draft and make its caller the creator (BR-41, BR-45). The draft goes through the app schema again here, so
 * the build step trusts nothing the phone sent. A taken or reserved id gets a number after it, atomically (the store's unique key).
 */
export async function createAppFor(draft: unknown, req: Request): Promise<Reply> {
  const config = validateDraft(draft);
  const store = getAppStore();
  let app: AppConfig | undefined;
  for (let n = 1; n <= 6 && !app; n++) {
    const id = n === 1 ? config.id : `${config.id.slice(0, 36)}-${n}`;
    try {
      app = await store.create({ ...config, id });
    } catch (e) {
      if (!(e instanceof AppStoreError) || (e.code !== "app_exists" && e.code !== "reserved_id")) throw e;
    }
  }
  if (!app) throw new InterviewError("invalid_draft", "That name is already used by other apps. Please pick a different name.");
  const me = await getIdentityStore().join(app.id, "creator");
  return new Reply(
    { app: appSummary(app), path: `/app/${app.id}`, memberId: me.memberId, role: "creator", recoveryCode: me.recoveryCode, notice: LIGHT_IDENTITY_NOTICE },
    [sessionCookie(req, app.id, me.sessionToken)],
  );
}

/** Each interview call can cost a model call, and a build stores an app, so both have tighter limits than the other routes (per address). */
export const interviewLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
export const buildLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const resetInterviewLimits = () => {
  interviewLimiter.reset();
  buildLimiter.reset();
};
