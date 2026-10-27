import { readFileSync } from "node:fs";
import { loadApp, validateSandbox } from "@/lib/app-config";
import { buildCity, type City } from "../core/persona.schema";

/** Read and validate an app's sandbox city from `apps/<id>/<cityDir>/` (relative to the working directory). */
export async function loadCity(appId: string, seed: number, root = "."): Promise<City> {
  const app = await loadApp(appId);
  const dir = `${root}/apps/${appId}/${app.simulation.cityDir}`;
  const read = (f: string) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const participants = read("participants.json");
  const personas = read("personas.json");
  const problems = validateSandbox(app, participants, personas);
  if (problems.length) throw new Error(`sandbox city for ${appId} is invalid: ${problems.join("; ")}`);
  return buildCity(app, participants, personas, seed);
}
