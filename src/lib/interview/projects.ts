import { randomBytes } from "node:crypto";
import { parseAnswer, STEP_ORDER, type Answer, type StepId } from "./script";

/**
 * Interview projects (BR-48): a project id is opened the moment someone starts creating an app, and every answer is recorded under
 * it, so the operator can see who really is doing it, before any app exists. The id is a random 128-bit value: whoever holds it can
 * add answers to that one draft and nothing else (it opens no app, no member and no session). Only words the person chose to give as
 * answers are kept, in the words shown back to them; nothing is read from the request but the answers.
 */
export type ProjectSource = "phone" | "assistant";

export interface ProjectRecord {
  id: string;
  source: ProjectSource;
  createdAt: string;
  updatedAt: string;
  /** In interview order, one per step. */
  answers: { step: StepId; label: string }[];
  /** Set when the person tapped "Build it". */
  appId?: string;
}

export class ProjectError extends Error {
  constructor(readonly code: "not_found" | "too_many_projects", message: string) {
    super(message);
  }
}

/** One document, replaced on every change (same shape as the identity backend). */
export interface ProjectBackend {
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
}

export interface ProjectStore {
  open(source: ProjectSource): Promise<ProjectRecord>;
  /** `replace` sets the answers (the phone sends all of them each time, so going back works); `merge` adds or changes the given steps. */
  record(id: string, answers: Answer[], mode: "replace" | "merge"): Promise<ProjectRecord>;
  markBuilt(id: string, appId: string): Promise<void>;
  /** Newest activity first. */
  list(): Promise<ProjectRecord[]>;
}

export const PROJECT_ID = /^p_[0-9a-f]{32}$/;
export const MAX_PROJECTS = 20_000;
const DAY = 24 * 3600_000;
/** An interview nobody finished is forgotten after 30 days; a built one after 90. */
export const UNBUILT_TTL_MS = 30 * DAY;
export const BUILT_TTL_MS = 90 * DAY;

interface Doc {
  projects: Record<string, ProjectRecord>;
}

export function createProjectStore(backend?: ProjectBackend, now: () => number = Date.now): ProjectStore {
  let doc: Doc | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  const loaded = async (): Promise<Doc> => {
    if (doc) return doc;
    const raw = await backend?.load();
    return (doc = raw ? (JSON.parse(raw) as Doc) : { projects: {} });
  };
  const mutate = <T>(fn: (d: Doc) => T): Promise<T> => {
    const run = tail.then(async () => {
      const d = await loaded();
      const out = fn(d);
      await backend?.save(JSON.stringify(d));
      return out;
    });
    tail = run.catch(() => undefined);
    return run;
  };
  const iso = () => new Date(now()).toISOString();
  const sweep = (d: Doc) => {
    const t = now();
    for (const [id, p] of Object.entries(d.projects)) if (t - Date.parse(p.updatedAt) > (p.appId ? BUILT_TTL_MS : UNBUILT_TTL_MS)) delete d.projects[id];
  };
  const find = (d: Doc, id: string): ProjectRecord => {
    const p = PROJECT_ID.test(id) ? d.projects[id] : undefined;
    if (!p) throw new ProjectError("not_found", "There is no such project.");
    return p;
  };

  return {
    open: (source) =>
      mutate((d) => {
        sweep(d);
        if (Object.keys(d.projects).length >= MAX_PROJECTS) throw new ProjectError("too_many_projects", "Too many interviews are open right now. Please try again later.");
        const at = iso();
        const p: ProjectRecord = { id: `p_${randomBytes(16).toString("hex")}`, source, createdAt: at, updatedAt: at, answers: [] };
        d.projects[p.id] = p;
        return p;
      }),
    record: (id, answers, mode) =>
      mutate((d) => {
        const p = find(d, id);
        if (p.appId) return p; // built: the interview is over
        const byStep = new Map(mode === "merge" ? p.answers.map((a) => [a.step, a.label]) : []);
        for (const a of answers) byStep.set(a.step, parseAnswer(a).label);
        p.answers = STEP_ORDER.filter((s) => byStep.has(s)).map((step) => ({ step, label: byStep.get(step)! }));
        p.updatedAt = iso();
        return p;
      }),
    markBuilt: (id, appId) =>
      mutate((d) => {
        const p = find(d, id);
        p.appId = appId;
        p.updatedAt = iso();
      }),
    async list() {
      return Object.values(await loaded().then((d) => d.projects)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
  };
}
