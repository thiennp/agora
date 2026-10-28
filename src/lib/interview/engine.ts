import { z } from "zod";
import type { AppConfig } from "../app-config";
import { assemble, defaultsFor, fallbackSketch, sketchSchema, type AnswerMap, type Assembled, type Sketch } from "./draft";
import {
  EXAMPLES, InterviewError, REMOVED_MESSAGE, STEP_ORDER, isRemovedStep, isStepId, parseAnswer, stepOf,
  type Answer, type Option, type Parsed, type StepId,
} from "./script";
import { cleanText } from "./text";

/** The model's two jobs. It may fail or answer badly at any time: the interview then runs on code alone. */
export interface InterviewModel {
  /** 2 or 3 example answers for a step, fitted to what the person has said so far. */
  examples(step: "actions" | "name", answers: Parsed[]): Promise<string[]>;
  /** A raw draft (checked against `sketchSchema` here, never trusted). */
  sketch(answers: Parsed[]): Promise<unknown>;
}

export const examplesSchema = z.object({ examples: z.array(z.string().min(2).max(60)).min(2).max(3) });

export interface Question {
  step: StepId;
  /** 1-based position and total, for "Question 3 of 6". */
  n: number;
  of: number;
  ask: string;
  hint?: string;
  options: Option[];
  otherLabel: string;
  /** Tap answers fill the box and the answer is text (true), or are sent as a choice (false). */
  freeText: boolean;
  maxLength: number;
}

export interface SummaryLine {
  label: string;
  value: string;
}

export type Turn =
  | { kind: "ask"; question: Question; said: SummaryLine[] }
  | { kind: "review"; draft: AppConfig; lines: SummaryLine[]; notes: string[]; promise: string; source: "model" | "code" };

export const PROMISE = "Your agent will always check with you before it agrees to anything, gives money terms, shares who you are or where you live, chooses shipping, or makes a safety exception.";
const MAX_ANSWERS = STEP_ORDER.length;


/** Read the answers so far in order. Throws `invalid_answer` for a wrong step, an unusable answer or too many answers. */
function readAnswers(answers: Answer[]): { parsed: Parsed[]; map: AnswerMap } {
  if (answers.length > MAX_ANSWERS) throw new InterviewError("invalid_answer", "That is more answers than the interview asks for. Start again.");
  const map: AnswerMap = {};
  const parsed: Parsed[] = [];
  answers.forEach((a, i) => {
    if (isRemovedStep(a.step)) throw new InterviewError("invalid_answer", REMOVED_MESSAGE);
    if (!isStepId(a.step) || a.step !== STEP_ORDER[i]) throw new InterviewError("invalid_answer", "The answers are out of order. Start again.");
    const p = parseAnswer(a);
    map[a.step] = p;
    parsed.push(p);
  });
  return { parsed, map };
}

const valueLabel = (p: Parsed | undefined, fallback = "-") => (p ? p.label : fallback);

/** Your own words first (verbatim), then the kinds of thing the app refuses; "nothing" only when there is neither. */
const careLine = (c: AppConfig) => {
  const parts = [...c.policies.ownerRules, ...c.policies.forbiddenItems.map((f) => f.label)];
  return parts.length ? parts.join("; ") : "Nothing in particular";
};

/** The plain-words summary shown before the yes. Built from the checked config, not from the model's words. */
export function summarize(a: AnswerMap, config: AppConfig): SummaryLine[] {
  const d = defaultsFor(a);
  return [
    { label: "Name", value: config.name },
    { label: "What it is for", value: valueLabel(a.purpose) },
    { label: "What people can do", value: valueLabel(a.actions) },
    { label: "How it works", value: valueLabel(a.how) },
    { label: "Careful about", value: careLine(config) },
    // What was not asked, said honestly (docs/CREATE-AN-APP.md "What the platform sets for you").
    { label: "Set for you", value: `Open to any Muse user, online. Muse handles languages.${d.says ? ` ${d.says}` : ""}` },
  ];
}

async function examplesFor(step: "actions" | "name", parsed: Parsed[], map: AnswerMap, model: InterviewModel): Promise<string[]> {
  try {
    const got = examplesSchema.safeParse({ examples: await model.examples(step, parsed) });
    if (got.success) {
      const clean = got.data.examples.map((e) => cleanText(e, 60)).filter((e) => e.length >= 2);
      if (clean.length >= 2) return clean;
    }
  } catch {
    // The model is optional: static examples below.
  }
  const kind = map.purpose?.value;
  return EXAMPLES[step][kind === "learn" || kind === "organise" ? kind : "exchange"];
}

async function draftFor(map: AnswerMap, parsed: Parsed[], model: InterviewModel): Promise<Assembled & { source: "model" | "code" }> {
  try {
    const sketch = sketchSchema.safeParse(await model.sketch(parsed));
    if (sketch.success) return { ...assemble(map, sketch.data), source: "model" };
  } catch {
    // A model error, or a draft the app schema refuses: code drafts it instead. The person is never shown a rejected draft.
  }
  return { ...assemble(map, fallbackSketch(map) as Sketch), source: "code" };
}

/**
 * Where the interview stands, given the answers so far. Stateless: the phone sends all answers each time, code checks each one
 * in order and returns the next question, or, after the last, the checked draft for the one yes (BR-40).
 */
export async function advance(answers: Answer[], model: InterviewModel): Promise<Turn> {
  const { parsed, map } = readAnswers(answers);
  const order = STEP_ORDER;
  const said = parsed.map((p) => ({ label: stepOf(p.step).ask, value: p.label }));
  const next = order[parsed.length];
  if (next === undefined) {
    const d = await draftFor(map, parsed, model);
    return { kind: "review", draft: d.config, lines: summarize(map, d.config), notes: d.notes, promise: PROMISE, source: d.source };
  }
  const step = stepOf(next);
  const options =
    next === "actions" || next === "name"
      ? (await examplesFor(next, parsed, map, model)).map((label, i) => ({ id: `e${i}`, label }))
      : next === "how"
        ? EXAMPLES.how[map.purpose?.value === "learn" || map.purpose?.value === "organise" ? map.purpose.value : "exchange"].map((label, i) => ({ id: `e${i}`, label }))
        : step.options;
  return {
    kind: "ask",
    said,
    question: { step: next, n: parsed.length + 1, of: order.length, ask: step.ask, hint: step.hint, options, otherLabel: step.otherLabel, freeText: step.freeText, maxLength: step.maxLength },
  };
}
