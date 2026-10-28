import type { OwnerQuestion } from "../core/owner-question.schema";
import { tracked } from "@/lib/state";

export function createQuestionStore() {
  const rows = tracked("cards.questions", new Map<string, OwnerQuestion>());
  return {
    rows,
    forFamily: (familyId: string) => [...rows.values()].filter((q) => q.familyId === familyId),
    forDeal: (dealId: string) => [...rows.values()].filter((q) => q.dealId === dealId),
  };
}
export type QuestionStore = ReturnType<typeof createQuestionStore>;
