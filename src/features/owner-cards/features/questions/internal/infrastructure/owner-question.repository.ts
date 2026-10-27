import type { OwnerQuestion } from "../core/owner-question.schema";

export function createQuestionStore() {
  const rows = new Map<string, OwnerQuestion>();
  return {
    rows,
    forFamily: (familyId: string) => [...rows.values()].filter((q) => q.familyId === familyId),
    forDeal: (dealId: string) => [...rows.values()].filter((q) => q.dealId === dealId),
  };
}
export type QuestionStore = ReturnType<typeof createQuestionStore>;
