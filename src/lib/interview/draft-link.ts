import { InterviewError, REMOVED_STEPS, STEP_ORDER, isRemovedStep, isStepId, parseAnswer, stepOf, type Answer, type StepId } from "./script";

/**
 * The draft link (docs/CREATE-AN-APP.md "If you are an assistant"): an assistant that can only open links hands the person
 * `/start?draft=a~b~c…` (answers in interview order, separated by `~`: short enough to paste), or one query value per step
 * (`?purpose=…&actions=…`), or `?draft=<URL-encoded JSON object>` with the same keys.
 * It carries ANSWERS, not a config: they go through the same reader as a tap (`parseAnswer`), the same fixed order and the same app
 * schema, so a link cannot set a rule, relax an always-ask topic or carry an instruction (text is only ever data). It builds nothing:
 * it opens the summary, and the person's own tap on "Build it" is the only thing that stores an app.
 */
export const MAX_DRAFT_CHARS = 2000;

const OLD_LINK = "That link was made for an older version of the questions, which asked about who joins, a place and languages. An app is open to any Muse user now, so those answers are not used.";

export interface DraftLink {
  /** The answers the link holds, in interview order, up to the first step it does not answer or answers unusably. */
  answers: Answer[];
  /** Plain words for the person when part of the link could not be used; undefined when it was all fine (or there was no link). */
  problem?: string;
}

/**
 * One answer as it goes into a link: a typed `~` becomes a space (it separates answers), then everything but letters, digits and
 * `-_.!*()` is percent-encoded as UTF-8: space `%20`, comma `%2C`, apostrophe `%27`, ampersand `%26`, question mark `%3F`, hash `%23`.
 */
export const encodeAnswer = (text: string): string =>
  encodeURIComponent(text.replace(/~/g, " ").replace(/\s+/g, " ").trim()).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** The whole link for answers in interview order. */
export const buildDraftLink = (baseUrl: string, answers: string[]): string => `${baseUrl}/start?draft=${answers.map(encodeAnswer).join("~")}`;

/**
 * The page's query reader has already decoded the link once. An assistant that encodes twice leaves `%20`, `%27` … in the words:
 * decode those once more when the whole value is valid UTF-8 percent-encoding, otherwise leave the words as they are.
 */
const tidy = (v: string): string => {
  if (!/%[0-9a-f]{2}/i.test(v)) return v;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

type Query = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Collect the per-step values from the query. Anything that is not a short string under a known step name is ignored. */
function collect(query: Query): { values: Partial<Record<StepId, string>>; positional?: string[]; problem?: string; old?: boolean } {
  const values: Partial<Record<StepId, string>> = {};
  const raw = first(query.draft);
  let old = false;
  if (raw !== undefined) {
    if (raw.length > MAX_DRAFT_CHARS) return { values, problem: "That link holds too much text to use." };
    if (!raw.trimStart().startsWith("{")) {
      const positional = raw.split("~").map((x) => tidy(x).trim());
      // Links of the older, longer interview have more parts than there are questions now: they cannot be read in the new order.
      return positional.length > STEP_ORDER.length ? { values, problem: OLD_LINK } : { values, positional };
    }
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      return { values, problem: "I could not read the answers in that link." };
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { values, problem: "I could not read the answers in that link." };
    for (const [k, v] of Object.entries(obj)) {
      if (isRemovedStep(k)) old = true;
      else if (isStepId(k) && typeof v === "string") values[k] = tidy(v);
    }
  }
  let total = 0;
  if (REMOVED_STEPS.some((id) => first(query[id]) !== undefined)) old = true;
  for (const id of STEP_ORDER) {
    const v = first(query[id]);
    if (v === undefined) continue;
    total += v.length;
    if (total > MAX_DRAFT_CHARS) return { values, problem: "That link holds too much text to use." };
    values[id] = tidy(v);
  }
  return old ? { values, old } : { values };
}

/** Turn the query of `/start` into interview answers. Never throws. */
export function answersFromQuery(query: Query): DraftLink {
  const { values, positional, problem, old } = collect(query);
  if (problem) return { answers: [], problem };
  const answers: Answer[] = [];
  let at = 0;
  for (const id of STEP_ORDER) {
    const v = positional ? positional[at++] : values[id];
    if (v === undefined || (positional && v === "")) break; // the interview continues from here
    const step = stepOf(id);
    const answer: Answer = step.options.some((o) => o.id === v) ? { step: id, choice: v } : { step: id, text: v };
    try {
      parseAnswer(answer);
    } catch (e) {
      if (!(e instanceof InterviewError)) throw e;
      return { answers, problem: `I could not use part of that link, so I kept the answers before it (${step.ask} ${e.message})` };
    }
    answers.push(answer);
  }
  return old ? { answers, problem: OLD_LINK } : { answers };
}
