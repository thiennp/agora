import { InterviewError, STEP_ORDER, isStepId, parseAnswer, stepOf, type Answer, type StepId } from "./script";

/**
 * The draft link (docs/CREATE-AN-APP.md "If you are an assistant"): an assistant that can only open links hands the person
 * `/start?draft=a~b~c…` (answers in interview order, separated by `~`: short enough to paste), or one query value per step
 * (`?purpose=…&people=…`), or `?draft=<URL-encoded JSON object>` with the same keys.
 * It carries ANSWERS, not a config: they go through the same reader as a tap (`parseAnswer`), the same fixed order and the same app
 * schema, so a link cannot set a rule, relax an always-ask topic or carry an instruction (text is only ever data). It builds nothing:
 * it opens the summary, and the person's own tap on "Build it" is the only thing that stores an app.
 */
export const MAX_DRAFT_CHARS = 2000;

export interface DraftLink {
  /** The answers the link holds, in interview order, up to the first step it does not answer or answers unusably. */
  answers: Answer[];
  /** Plain words for the person when part of the link could not be used; undefined when it was all fine (or there was no link). */
  problem?: string;
}

type Query = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Collect the per-step values from the query. Anything that is not a short string under a known step name is ignored. */
function collect(query: Query): { values: Partial<Record<StepId, string>>; positional?: string[]; problem?: string } {
  const values: Partial<Record<StepId, string>> = {};
  const raw = first(query.draft);
  if (raw !== undefined) {
    if (raw.length > MAX_DRAFT_CHARS) return { values, problem: "That link holds too much text to use." };
    if (!raw.trimStart().startsWith("{")) return { values, positional: raw.split("~").map((x) => x.trim()) };
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      return { values, problem: "I could not read the answers in that link." };
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { values, problem: "I could not read the answers in that link." };
    for (const [k, v] of Object.entries(obj)) if (isStepId(k) && typeof v === "string") values[k] = v;
  }
  let total = 0;
  for (const id of STEP_ORDER) {
    const v = first(query[id]);
    if (v === undefined) continue;
    total += v.length;
    if (total > MAX_DRAFT_CHARS) return { values, problem: "That link holds too much text to use." };
    values[id] = v;
  }
  return { values };
}

/** Turn the query of `/start` into interview answers. Never throws. */
export function answersFromQuery(query: Query): DraftLink {
  const { values, positional, problem } = collect(query);
  if (problem) return { answers: [], problem };
  const answers: Answer[] = [];
  let local = false;
  let at = 0;
  for (const id of STEP_ORDER) {
    if (id === "placeName" && !local) continue;
    const v = positional ? positional[at++] : values[id];
    if (v === undefined || (positional && v === "")) break; // the interview continues from here
    const step = stepOf(id);
    const answer: Answer = step.options.some((o) => o.id === v) ? { step: id, choice: v } : { step: id, text: v };
    try {
      const parsed = parseAnswer(answer);
      if (id === "place") local = parsed.value !== "online";
    } catch (e) {
      if (!(e instanceof InterviewError)) throw e;
      return { answers, problem: `I could not use part of that link, so I kept the answers before it (${step.ask} ${e.message})` };
    }
    answers.push(answer);
  }
  return { answers };
}
