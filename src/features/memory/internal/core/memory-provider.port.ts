import type { Context, Lesson, Outcome } from "./context.schema";

/** The only way slices touch memory (MEM-01). Every call is scoped to one family and never reads another's data (MEM-03). */
export interface MemoryProvider {
  readonly name: string;
  getFamilyContext(familyId: string): Promise<Context>;
  /** Insert or replace by lesson id. */
  recordLesson(familyId: string, lesson: Lesson): Promise<void>;
  deleteLesson(familyId: string, lessonId: string): Promise<boolean>;
  recordDealOutcome(familyId: string, outcome: Outcome): Promise<void>;
  /** Owner erasure (FAM-03). */
  eraseFamily(familyId: string): Promise<void>;
}
