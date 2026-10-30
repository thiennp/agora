import type { Context, Lesson, Outcome } from "../../../../internal/core/context.schema";
import type { MemoryProvider } from "../../../../internal/core/memory-provider.port";
import { createLocalProvider } from "../../../local/public-api/infrastructure";

/** What the AgentWitch mirror needs. */
export interface AgentWitchClient {
  knowledgeUpdate(projectId: string, lesson: string): Promise<void>;
  mirrorOutcome(projectId: string, outcome: Outcome): Promise<void>;
}

/** An error the mirror must not retry (not paired, no access). */
export class AgentWitchFatalError extends Error {}

interface MirrorFailure {
  what: "lesson" | "outcome";
  familyId: string;
  attempts: number;
  fatal: boolean;
  message: string;
}

/**
 * Memory provider backed by a local store (reads are always local: fast, complete and isolated) that mirrors lessons and
 * deal outcomes to a per-family AgentWitch project when allowed (MEM-AGW-01, 02). A mirror failure never blocks anything:
 * it is reported through `onError` and retried by `flush()` up to 5 times, except fatal errors (MEM-04, MEM-AGW-03).
 * AgentWitch has no delete, so mirroring is gated on `shouldMirror` (the family's consent): a deleted lesson would remain remotely.
 */
export function createAgentWitchProvider(deps: {
  client: AgentWitchClient;
  /** The family's AgentWitch project, or undefined when none exists (then nothing is mirrored). */
  projectIdOf: (familyId: string) => string | undefined;
  shouldMirror: (familyId: string) => boolean;
  onError?: (f: MirrorFailure) => void;
  local?: MemoryProvider;
}): MemoryProvider & { flush(): Promise<{ sent: number; pending: number }>; pending(): number } {
  const local = deps.local ?? createLocalProvider();
  const queue: { run: () => Promise<void>; what: MirrorFailure["what"]; familyId: string; attempts: number }[] = [];

  async function attempt(job: (typeof queue)[number]): Promise<boolean> {
    try {
      await job.run();
      return true;
    } catch (e) {
      job.attempts += 1;
      const fatal = e instanceof AgentWitchFatalError;
      deps.onError?.({ what: job.what, familyId: job.familyId, attempts: job.attempts, fatal, message: (e as Error).message });
      if (!fatal && job.attempts < 5) queue.push(job);
      return false;
    }
  }
  const enqueue = (what: MirrorFailure["what"], familyId: string, run: () => Promise<void>) => {
    const projectId = deps.projectIdOf(familyId);
    if (!projectId || !deps.shouldMirror(familyId)) return;
    void attempt({ run, what, familyId, attempts: 0 });
    void projectId;
  };

  return {
    name: "agentwitch",
    getFamilyContext: (f: string): Promise<Context> => local.getFamilyContext(f),
    async recordLesson(familyId, lesson: Lesson) {
      await local.recordLesson(familyId, lesson);
      const projectId = deps.projectIdOf(familyId);
      if (projectId) enqueue("lesson", familyId, () => deps.client.knowledgeUpdate(projectId, `${lesson.text} (confidence ${lesson.confidence.toFixed(2)}, seen ${lesson.count} times)`));
    },
    deleteLesson: (f, id) => local.deleteLesson(f, id),
    async recordDealOutcome(familyId, outcome: Outcome) {
      await local.recordDealOutcome(familyId, outcome);
      const projectId = deps.projectIdOf(familyId);
      if (projectId) enqueue("outcome", familyId, () => deps.client.mirrorOutcome(projectId, outcome));
    },
    eraseFamily: (f) => local.eraseFamily(f),
    pending: () => queue.length,
    /** Retry what failed earlier. Call from a timer. */
    async flush() {
      const jobs = queue.splice(0, queue.length);
      let sent = 0;
      for (const j of jobs) if (await attempt(j)) sent += 1;
      return { sent, pending: queue.length };
    },
  };
}
