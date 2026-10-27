import { z } from "zod";
import type { AppConfig } from "./schema";

/** Format of `apps/<id>/<simulation.cityDir>/participants.json`. Every entry is synthetic. */
export const participantsSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z][a-z0-9-]*$/),
      name: z.string(),
      language: z.string().min(2),
      district: z.string(),
      /** Values for the app's `participant.fields`, keyed by field id. */
      profile: z.record(z.union([z.string(), z.number()])),
      /** Category ids. */
      offers: z.array(z.string()),
      wants: z.array(z.string()),
      synthetic: z.literal(true),
    }),
  )
  .min(1);

/** Format of `apps/<id>/<simulation.cityDir>/personas.json`: how each simulated owner behaves. */
export const personasSchema = z
  .array(
    z.object({
      id: z.string(),
      style: z.enum(["brief", "chatty", "price-sensitive", "generous"]),
      /** Plain-language rule the simulated owner uses to accept or decline; hidden from the agents. */
      hiddenAcceptRule: z.string(),
    }),
  )
  .min(1);

/** Cross-checks a sandbox city against its app. Returns a list of problems (empty when valid). */
export function validateSandbox(app: AppConfig, participants: unknown, personas: unknown): string[] {
  const problems: string[] = [];
  const ps = participantsSchema.safeParse(participants);
  const pe = personasSchema.safeParse(personas);
  if (!ps.success) problems.push(`participants.json: ${ps.error.message}`);
  if (!pe.success) problems.push(`personas.json: ${pe.error.message}`);
  if (!ps.success || !pe.success) return problems;

  const cats = new Set(app.catalog.categories.map((c) => c.id));
  const fields = app.participant.fields.map((f) => f.id);
  const ids = new Set(ps.data.map((p) => p.id));
  for (const p of ps.data) {
    if (!app.policies.languages.includes(p.language)) problems.push(`${p.id}: language ${p.language} not in app languages`);
    for (const c of [...p.offers, ...p.wants]) if (!cats.has(c)) problems.push(`${p.id}: unknown category ${c}`);
    for (const f of fields) if (!(f in p.profile)) problems.push(`${p.id}: missing profile field ${f}`);
  }
  for (const pe2 of pe.data) if (!ids.has(pe2.id)) problems.push(`personas: unknown participant ${pe2.id}`);
  if (ps.data.length < 10) problems.push("sandbox city needs at least 10 participants");
  return problems;
}
