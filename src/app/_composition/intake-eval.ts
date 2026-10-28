import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IntakeEvalResults } from "../../../evals/intake-eval";

/** The last measured intake eval (`npm run evals:intake`), or null when it has not been run. It is a file in the repository: the page never calls a model. */
export function loadIntakeEval(): IntakeEvalResults | null {
  const file = join(process.cwd(), "evals", "intake-eval.results.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as IntakeEvalResults;
  } catch {
    return null;
  }
}
