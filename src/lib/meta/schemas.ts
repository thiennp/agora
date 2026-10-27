import type { z } from "zod";

export class InvalidModelOutputError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/** Parse model text as JSON and validate it (LIB-META-04); invalid output never reaches business logic. */
export function parseModelOutput<S extends z.ZodTypeAny>(text: string, schema: S): z.infer<S> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    throw new InvalidModelOutputError("output is not valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw new InvalidModelOutputError(result.error.message);
  return result.data;
}
