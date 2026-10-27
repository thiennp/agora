import type { Context, Lesson, Outcome } from "../../../../internal/core/context.schema";
import type { MemoryProvider } from "../../../../internal/core/memory-provider.port";

const MAX_OUTCOMES = 200;

/** Default provider for demos, CI and judges: no external dependency (MEM-LOC-02). Each family has its own store (MEM-03). */
export function createLocalProvider(): MemoryProvider {
  const families = new Map<string, { lessons: Map<string, Lesson>; outcomes: Outcome[] }>();
  const of = (familyId: string) => families.get(familyId) ?? families.set(familyId, { lessons: new Map(), outcomes: [] }).get(familyId)!;
  return {
    name: "local",
    async getFamilyContext(familyId: string): Promise<Context> {
      const f = families.get(familyId);
      return structuredClone({ familyId, lessons: f ? [...f.lessons.values()] : [], recentOutcomes: f ? f.outcomes.slice(-50) : [] });
    },
    async recordLesson(familyId: string, lesson: Lesson) {
      if (lesson.familyId !== familyId) throw new Error("lesson belongs to another family");
      of(familyId).lessons.set(lesson.id, structuredClone(lesson));
    },
    async deleteLesson(familyId: string, lessonId: string) {
      return families.get(familyId)?.lessons.delete(lessonId) ?? false;
    },
    async recordDealOutcome(familyId: string, outcome: Outcome) {
      const f = of(familyId);
      f.outcomes.push(structuredClone(outcome));
      if (f.outcomes.length > MAX_OUTCOMES) f.outcomes.splice(0, f.outcomes.length - MAX_OUTCOMES);
    },
    async eraseFamily(familyId: string) {
      families.delete(familyId);
    },
  };
}
