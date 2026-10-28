import { cleanText } from "./text";

/**
 * The interview script (docs/CREATE-AN-APP.md "What to find out"): the order, the wording and the tap answers are fixed here, in
 * code. The model may only offer extra example answers for some steps and draft the app afterwards; it never decides what is asked.
 * Wording is plain and everyday: no schema, config or model words (the document's rule for the person-facing side).
 */
export type StepId = "purpose" | "actions" | "how" | "care" | "name" | "feel";

/**
 * Questions this interview used to ask, when it assumed a closed community with its own members, a place and languages. An app is for
 * any Muse user, so none of that is asked any more; a stale link or saved answer that names one is told so instead of being misread.
 */
export const REMOVED_STEPS = ["people", "things", "place", "placeName", "languages", "handover", "pricing"] as const;
export const isRemovedStep = (id: unknown): boolean => typeof id === "string" && (REMOVED_STEPS as readonly string[]).includes(id);

export interface Option {
  id: string;
  label: string;
}

export interface Step {
  id: StepId;
  ask: string;
  /** One friendly line under the question: why it matters, in the person's terms. */
  hint?: string;
  /** Tap answers. A step with `value` options is parsed by code; others pass the text on as it is. */
  options: Option[];
  otherLabel: string;
  /** When true the tap answers are examples that fill the text box; the answer is always the text. */
  freeText: boolean;
  maxLength: number;
}

/** The one sentence that says what is happening; shown on the page and told first by an assistant (docs/CREATE-AN-APP.md). */
export const INTERVIEW_PURPOSE =
  "I'm going to ask you a few quick questions to create your own app, for example an app to swap things, learn a skill or organise a run. It takes about two minutes, and nothing is built until you say yes.";

export const PURPOSE: Option[] = [
  { id: "exchange", label: "Swap or lend things people no longer need" },
  { id: "learn", label: "Learn a skill together with others" },
  { id: "organise", label: "Organise a run or a volunteer shift" },
];

export const FEEL: Option[] = [
  { id: "friendly", label: "Friendly and warm" },
  { id: "serious", label: "Calm and serious" },
  { id: "playful", label: "Playful and bright" },
];

export const CARE: Option[] = [
  { id: "none", label: "Nothing special" },
  { id: "safe", label: "Nothing dangerous or illegal" },
];

/** Example answers per kind of app for the steps whose examples depend on what the app is for. */
export const EXAMPLES: Record<"actions" | "how" | "name", Record<"exchange" | "learn" | "organise", string[]>> = {
  actions: {
    exchange: ["Offer things I no longer need", "Ask for something I am looking for", "Agree a swap or a loan"],
    learn: ["Share a tip or a lesson", "Ask a question", "Join a practice session"],
    organise: ["Sign up for a run or a shift", "Post a new event", "See who else is coming"],
  },
  how: {
    exchange: ["People post what they have, others ask, then they agree", "Say what you need and we find a match"],
    learn: ["Pick a skill, find a partner, practise together", "Someone teaches, others join and ask questions"],
    organise: ["Post an event, people sign up, everyone gets a reminder", "Pick a date, see who is free, confirm"],
  },
  name: {
    exchange: ["Swap Circle", "Pass It Along", "Street Share"],
    learn: ["Study Together", "Learning Circle", "Skill Share"],
    organise: ["Run Together", "Helping Hands", "Next Shift"],
  },
};

const STEPS: Record<StepId, Step> = {
  purpose: { id: "purpose", ask: "To set up your app: what is it for, and what problem does it solve for the people who use it?", hint: "Tell it like you would to a friend. Pick an example or write your own.", options: PURPOSE, otherLabel: "Something else", freeText: false, maxLength: 300 },
  actions: { id: "actions", ask: "What can a person do in your app? Name the main things, in your own words.", hint: "A few are enough. Your agent will sort the rest.", options: [], otherLabel: "Something else", freeText: true, maxLength: 200 },
  how: { id: "how", ask: "How does your app work, step by step? One or two sentences is enough.", hint: "For example: someone posts something, others respond, they agree.", options: [], otherLabel: "Something else", freeText: true, maxLength: 300 },
  care: { id: "care", ask: "Is there anything your app should never do or share?", hint: "Your agent will keep it out and ask you first when in doubt.", options: CARE, otherLabel: "Something else", freeText: false, maxLength: 300 },
  name: { id: "name", ask: "What should your app be called?", hint: "A short name people will remember.", options: [], otherLabel: "Something else", freeText: true, maxLength: 40 },
  feel: { id: "feel", ask: "Last one: how should your app feel?", options: FEEL, otherLabel: "Something else", freeText: false, maxLength: 60 },
};

export const STEP_ORDER: StepId[] = ["purpose", "actions", "how", "care", "name", "feel"];

export const stepOf = (id: StepId): Step => STEPS[id];
export const isStepId = (id: string): id is StepId => Object.hasOwn(STEPS, id);

/** One answer as sent by the phone: a tap (`choice` is an option id) or typed words. */
export interface Answer {
  step: StepId;
  choice?: string;
  text?: string;
}

/** Answers once code has read them: the words to show back, and for steps code parses, the value it decided. */
export interface Parsed {
  step: StepId;
  /** Words shown back to the person. */
  label: string;
  /** For `purpose`, `care`, `feel`: the id that code decided from the tap or the typed words. */
  value: string;
}

/** Said when an old link, a saved answer or a caller names a question that is no longer asked. */
export const REMOVED_MESSAGE = "That question is no longer part of creating an app. Please answer the current questions instead.";

export class InterviewError extends Error {
  constructor(readonly code: "invalid_answer" | "invalid_draft", message: string) {
    super(message);
  }
}

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

/** Free words for a step that code parses: the closest known value, or `undefined` when there is none (the person is asked again). */
function guess(step: StepId, t: string): string | undefined {
  switch (step) {
    case "purpose":
      if (has(t, ["learn", "study", "teach", "class", "lesson"])) return "learn";
      if (has(t, ["running", "a run", "volunteer", "shift", "event", "organi", "marathon", "meetup", "help"])) return "organise";
      if (has(t, ["swap", "trade", "lend", "borrow", "give", "sell", "exchange", "share"])) return "exchange";
      return "other";
    case "feel":
      if (has(t, ["serious", "calm", "formal", "professional"])) return "serious";
      if (has(t, ["play", "fun", "bright", "colour", "color"])) return "playful";
      return "friendly";
    default:
      return undefined;
  }
}

/** Read one answer. Throws `invalid_answer` with a friendly sentence when it cannot be used. */
export function parseAnswer(a: Answer): Parsed {
  if (!isStepId(a.step)) throw new InterviewError("invalid_answer", isRemovedStep(a.step) ? REMOVED_MESSAGE : "That is not a question of the interview. Start again.");
  const step = STEPS[a.step];
  const text = cleanText(a.text, step.maxLength);
  const tapped = a.choice === undefined ? undefined : step.options.find((o) => o.id === a.choice);
  if (a.choice !== undefined && !tapped) throw new InterviewError("invalid_answer", "That answer is not one of the choices. Please pick one or type your own.");
  if (tapped && !text) return { step: step.id, label: tapped.label, value: tapped.id };
  if (!text) throw new InterviewError("invalid_answer", "Please pick one of the answers or write a few words.");
  const value = guess(step.id, text.toLowerCase());
  return { step: step.id, label: text, value: value ?? text };
}
