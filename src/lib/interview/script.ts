import { cleanText } from "./text";

/**
 * The interview script (docs/CREATE-AN-APP.md "What to find out"): the order, the wording and the tap answers are fixed here, in
 * code. The model may only offer extra example answers for some steps and draft the app afterwards; it never decides what is asked.
 * Wording is plain and everyday: no schema, config or model words (the document's rule for the person-facing side).
 */
export type StepId = "purpose" | "people" | "things" | "place" | "placeName" | "languages" | "handover" | "pricing" | "care" | "name" | "feel";

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
  "I'm going to ask you a few quick questions to create your own app, for example a group to swap things, learn together or help each other. It takes about two minutes, and nothing is built until you say yes.";

export const PURPOSE: Option[] = [
  { id: "exchange", label: "Swap, lend or give away things we no longer need" },
  { id: "learn", label: "Learn something together as a group" },
  { id: "help", label: "Help each other out, like a neighbourhood help board" },
];

export const PLACE: Option[] = [
  { id: "online", label: "Online, people can be anywhere" },
  { id: "neighbourhood", label: "One neighbourhood" },
  { id: "city", label: "One town or city" },
];

export const HANDOVER: Option[] = [
  { id: "meet", label: "Meet up in person" },
  { id: "drop", label: "Leave it at a locker or a shop" },
  { id: "post", label: "Send it by post" },
];

export const PRICING: Option[] = [
  { id: "free", label: "Everything is free" },
  { id: "swap", label: "Swaps only, one thing for another" },
  { id: "agree", label: "Free, or people agree something in return" },
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

/** Example answers per purpose for the steps whose examples depend on what the group does. */
export const EXAMPLES: Record<"things" | "people" | "name", Record<string, string[]>> = {
  things: {
    exchange: ["Clothes and shoes", "Books and games", "Tools and household things"],
    learn: ["Lessons and tips from members", "Books and study notes", "Practice sessions"],
    help: ["Lifts and errands", "Skills like repairs and cooking", "Spare tools to borrow"],
  },
  people: {
    exchange: ["Neighbours on our street", "Parents from our school", "Friends and friends of friends"],
    learn: ["Classmates", "Colleagues from work", "Members of our club"],
    help: ["People who live nearby", "Members of our association", "Volunteers"],
  },
  name: {
    exchange: ["Swap Circle", "Pass It Along", "Street Share"],
    learn: ["Study Together", "Learning Circle", "Skill Share"],
    help: ["Good Neighbours", "Helping Hands", "Next Door"],
  },
};

const STEPS: Record<StepId, Step> = {
  purpose: { id: "purpose", ask: "To set up your app: what will the people in your community do together?", hint: "Tell it like you would to a friend. Pick one or write your own.", options: PURPOSE, otherLabel: "Something else", freeText: false, maxLength: 300 },
  people: { id: "people", ask: "Who should be able to join your app?", hint: "What do they have in common?", options: [], otherLabel: "Something else", freeText: true, maxLength: 120 },
  things: { id: "things", ask: "What will people share or offer each other in your app?", hint: "A few examples are enough. Your agent will sort the rest.", options: [], otherLabel: "Something else", freeText: true, maxLength: 200 },
  place: { id: "place", ask: "Where will your app's community be based? Do people need to be near each other?", options: PLACE, otherLabel: "Something else", freeText: false, maxLength: 120 },
  placeName: { id: "placeName", ask: "What is the place your app is for called?", hint: "For example the name of your neighbourhood or town.", options: [], otherLabel: "Type the name", freeText: true, maxLength: 80 },
  languages: { id: "languages", ask: "Which languages should your app work in?", hint: "Your agent will translate between them.", options: [{ id: "en", label: "English" }, { id: "en-es", label: "English and Spanish" }, { id: "en-de", label: "English and German" }], otherLabel: "Something else", freeText: false, maxLength: 120 },
  handover: { id: "handover", ask: "In your app, how will things usually change hands?", options: HANDOVER, otherLabel: "Something else", freeText: false, maxLength: 120 },
  pricing: { id: "pricing", ask: "In your app, should things be free, a swap, or can people agree something in return?", options: PRICING, otherLabel: "Something else", freeText: false, maxLength: 120 },
  care: { id: "care", ask: "Is there anything people should be careful about, or that should never be shared in your app?", hint: "Your agent will keep it out and ask you first when in doubt.", options: CARE, otherLabel: "Something else", freeText: false, maxLength: 300 },
  name: { id: "name", ask: "What should your app be called?", hint: "A short name people will remember.", options: [], otherLabel: "Something else", freeText: true, maxLength: 40 },
  feel: { id: "feel", ask: "Last one: how should your app feel?", options: FEEL, otherLabel: "Something else", freeText: false, maxLength: 60 },
};

export const STEP_ORDER: StepId[] = ["purpose", "people", "things", "place", "placeName", "languages", "handover", "pricing", "care", "name", "feel"];

export const stepOf = (id: StepId): Step => STEPS[id];
export const isStepId = (id: string): id is StepId => id in STEPS;

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
  /** For `purpose`, `place`, `handover`, `pricing`, `feel`: the id that code decided from the tap or the typed words. */
  value: string;
  /** For `languages`: ISO 639-1 codes. */
  codes?: string[];
}

export class InterviewError extends Error {
  constructor(readonly code: "invalid_answer" | "invalid_draft", message: string) {
    super(message);
  }
}

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

const LANGUAGES: Record<string, string> = {
  english: "en", spanish: "es", german: "de", vietnamese: "vi", french: "fr", portuguese: "pt", italian: "it", dutch: "nl",
  chinese: "zh", arabic: "ar", hindi: "hi", japanese: "ja", korean: "ko", turkish: "tr", polish: "pl", russian: "ru", ukrainian: "uk",
};
export const MAX_LANGUAGES = 5;

/** A language code in plain words for the summary; an unknown code is shown as it is. */
export const languageName = (code: string): string => {
  const name = Object.entries(LANGUAGES).find(([, c]) => c === code)?.[0];
  return name ? name[0]!.toUpperCase() + name.slice(1) : code;
};

export function parseLanguages(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  for (const [name, code] of Object.entries(LANGUAGES)) if (t.includes(name) && !found.includes(code)) found.push(code);
  for (const m of t.matchAll(/\b([a-z]{2})\b/g)) {
    const code = m[1]!;
    if (Object.values(LANGUAGES).includes(code) && !found.includes(code)) found.push(code);
  }
  return found.slice(0, MAX_LANGUAGES);
}

/** Free words for a step that code parses: the closest known value, or `undefined` when there is none (the person is asked again). */
function guess(step: StepId, t: string): string | undefined {
  switch (step) {
    case "purpose":
      if (has(t, ["learn", "study", "teach", "class", "lesson"])) return "learn";
      if (has(t, ["help", "volunteer", "favour", "favor", "support"])) return "help";
      if (has(t, ["swap", "trade", "lend", "borrow", "give", "sell", "exchange", "share"])) return "exchange";
      return "other";
    case "place":
      if (has(t, ["online", "anywhere", "world", "remote"])) return "online";
      if (has(t, ["neighbo", "street", "district", "village", "block"])) return "neighbourhood";
      return "city";
    case "handover":
      if (has(t, ["locker", "shop", "store", "drop"])) return "drop";
      if (has(t, ["post", "mail", "ship", "parcel"])) return "post";
      return "meet";
    case "pricing":
      if (has(t, ["free", "gift", "nothing in return"])) return "free";
      if (has(t, ["swap", "exchange", "trade", "barter"])) return "swap";
      return "agree";
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
  const step = STEPS[a.step];
  const text = cleanText(a.text, step.maxLength);
  const tapped = a.choice === undefined ? undefined : step.options.find((o) => o.id === a.choice);
  if (a.choice !== undefined && !tapped) throw new InterviewError("invalid_answer", "That answer is not one of the choices. Please pick one or type your own.");
  if (tapped && !text) {
    return step.id === "languages"
      ? { step: step.id, label: tapped.label, value: tapped.id, codes: parseLanguages(tapped.id.replace(/-/g, " ")) }
      : { step: step.id, label: tapped.label, value: tapped.id };
  }
  if (!text) throw new InterviewError("invalid_answer", "Please pick one of the answers or write a few words.");
  if (step.id === "languages") {
    const codes = parseLanguages(text);
    if (codes.length === 0) throw new InterviewError("invalid_answer", "I did not recognise a language in that. Try names like English or Spanish.");
    return { step: step.id, label: text, value: codes.join(","), codes };
  }
  const value = guess(step.id, text.toLowerCase());
  return { step: step.id, label: text, value: value ?? text };
}
