import { z } from "zod";
import type { AppConfig } from "../app-config";
import { assemble, fallbackSketch, sketchSchema, type AnswerMap, type Assembled, type Sketch } from "./draft";
import {
  EXAMPLES, InterviewError, STEP_ORDER, isStepId, languageName, parseAnswer, stepOf,
  type Answer, type Option, type Parsed, type StepId,
} from "./script";
import { cleanText } from "./text";

/** The model's two jobs. It may fail or answer badly at any time: the interview then runs on code alone. */
export interface InterviewModel {
  /** 2 or 3 example answers for a step, fitted to what the person has said so far. */
  examples(step: "things" | "people" | "name", answers: Parsed[]): Promise<string[]>;
  /** A raw draft (checked against `sketchSchema` here, never trusted). */
  sketch(answers: Parsed[]): Promise<unknown>;
}

export const examplesSchema = z.object({ examples: z.array(z.string().min(2).max(60)).min(2).max(3) });

export interface Question {
  step: StepId;
  /** 1-based position and total, for "Question 3 of 10". */
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

const isLocal = (a: AnswerMap) => a.place !== undefined && a.place.value !== "online";
const planned = (a: AnswerMap): StepId[] => STEP_ORDER.filter((s) => s !== "placeName" || isLocal(a));

/** Read the answers so far in order. Throws `invalid_answer` for a wrong step, an unusable answer or too many answers. */
function readAnswers(answers: Answer[]): { parsed: Parsed[]; map: AnswerMap } {
  if (answers.length > MAX_ANSWERS) throw new InterviewError("invalid_answer", "That is more answers than the interview asks for. Start again.");
  const map: AnswerMap = {};
  const parsed: Parsed[] = [];
  answers.forEach((a, i) => {
    const expected = planned(map)[i];
    if (!isStepId(a.step) || a.step !== expected) throw new InterviewError("invalid_answer", "The answers are out of order. Start again.");
    const p = parseAnswer(a);
    map[a.step] = p;
    parsed.push(p);
  });
  return { parsed, map };
}

const valueLabel = (p: Parsed | undefined, fallback = "-") => (p ? p.label : fallback);

/** The plain-words summary shown before the yes. Built from the checked config, not from the model's words. */
export function summarize(a: AnswerMap, config: AppConfig): SummaryLine[] {
  const modes = { pickup: "Meet up", locker: "A locker", parcel_shop: "A shop", shipping: "Post" } as const;
  const pricing = { free_only: "Everything is free", swap_only: "Swaps only", free_or_agreement: "Free, or people agree something in return" } as const;
  return [
    { label: "Name", value: config.name },
    { label: "What it is for", value: valueLabel(a.purpose) },
    { label: "Who joins", value: `${valueLabel(a.people)} (called ${config.participant.noun}s)` },
    { label: "What people share", value: config.catalog.categories.map((c) => c.label).join(", ") },
    { label: "Where", value: config.region.name },
    { label: "Languages", value: config.policies.languages.map(languageName).join(", ") },
    { label: "Handing things over", value: config.policies.handoffModes.map((m) => modes[m]).join(" or ").replace(/ or ([A-Z])/g, (_, c: string) => ` or ${c.toLowerCase()}`) },
    { label: "Giving or swapping", value: pricing[config.policies.pricing.mode] },
    { label: "Careful about", value: config.policies.forbiddenItems.length ? config.policies.forbiddenItems.map((f) => f.label).join(", ") : "Nothing in particular" },
  ];
}

async function examplesFor(step: "things" | "people" | "name", parsed: Parsed[], map: AnswerMap, model: InterviewModel): Promise<string[]> {
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
  return EXAMPLES[step][kind === "learn" || kind === "help" ? kind : "exchange"]!;
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
  const order = planned(map);
  const said = parsed.map((p) => ({ label: stepOf(p.step).ask, value: p.label }));
  const next = order[parsed.length];
  if (next === undefined) {
    const d = await draftFor(map, parsed, model);
    return { kind: "review", draft: d.config, lines: summarize(map, d.config), notes: d.notes, promise: PROMISE, source: d.source };
  }
  const step = stepOf(next);
  const options =
    next === "things" || next === "people" || next === "name"
      ? (await examplesFor(next, parsed, map, model)).map((label, i) => ({ id: `e${i}`, label }))
      : step.options;
  return {
    kind: "ask",
    said,
    question: { step: next, n: parsed.length + 1, of: order.length, ask: step.ask, hint: step.hint, options, otherLabel: step.otherLabel, freeText: step.freeText, maxLength: step.maxLength },
  };
}
