import type { SuggestedAnswer } from "../core/owner-question.schema";

export interface QuestionFacts {
  topic: string;
  /** Structured summary of what is being asked, never raw counterparty text. */
  terms?: string;
  window?: { from: string; to: string };
  weAreProposing?: boolean;
}

const fmt = (w: { from: string; to: string }) => `${w.from.slice(0, 16).replace("T", " ")} to ${w.to.slice(11, 16)} UTC`;

/**
 * Question wording and one-tap answers (OWN-02). Templates, not a model: a card must never carry text a counterparty
 * could have steered. English only until the language slice can translate cards per owner.
 */
export function questionContent(f: QuestionFacts): { text: string; answers: SuggestedAnswer[] } {
  switch (f.topic) {
    case "price_terms":
      return {
        text: `The terms on the table are: ${f.terms ?? "different terms"}. Do you accept them?`,
        answers: [{ id: "yes", label: "Yes, accept these terms" }, { id: "no", label: "No, decline the deal" }],
      };
    case "pickup_time_window":
      return {
        text: f.window
          ? f.weAreProposing
            ? `Your agent would like to suggest this pickup time: ${fmt(f.window)}. Is that OK?`
            : `The other side suggests this pickup time: ${fmt(f.window)}. Is that OK?`
          : "A pickup time needs to be agreed. Is it OK for your agent to go ahead?",
        answers: [{ id: "yes", label: "Yes, that works" }, { id: "no", label: "No, decline the deal" }],
      };
    default:
      return {
        text: "Your agent needs your decision before it can go on. Do you want it to continue?",
        answers: [{ id: "yes", label: "Yes, continue" }, { id: "no", label: "No, stop here" }],
      };
  }
}
