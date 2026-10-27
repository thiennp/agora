import { z } from "zod";
import type { AppConfig } from "@/lib/app-config";
import type { MetaClient } from "@/lib/meta";
import { noteIsHarmless } from "../../../offers/public-api/infrastructure";
import type { Offer } from "../../../offers/public-api/types";

const noteSchema = z.object({ note: z.string().trim().min(1).max(200) }).strict();

const TEMPLATES: Record<string, { propose: string; counter: string; accept: string }> = {
  en: { propose: "Hello! I'd love to take this if it is still available.", counter: "Thanks! Could we try a different time?", accept: "That works for us, subject to our owners confirming." },
  de: { propose: "Hallo! Ich würde das gern nehmen, falls es noch da ist.", counter: "Danke! Könnten wir eine andere Zeit versuchen?", accept: "Das passt, vorbehaltlich der Bestätigung durch unsere Besitzer." },
  es: { propose: "¡Hola! Me encantaría quedármelo si sigue disponible.", counter: "¡Gracias! ¿Podemos probar otra hora?", accept: "Nos viene bien, sujeto a la confirmación de nuestros dueños." },
  vi: { propose: "Xin chào! Mình rất muốn nhận món này nếu còn.", counter: "Cảm ơn! Mình thử giờ khác được không?", accept: "Được ạ, còn tùy chủ của hai bên xác nhận." },
};

export type NoteKind = "propose" | "counter" | "accept";

export const templateNote = (language: string, kind: NoteKind): string => (TEMPLATES[language] ?? TEMPLATES.en!)[kind];

/**
 * A short, friendly note in the owner's language. The structured offer carries the substance; the note is decoration.
 * The model's text is used only if it validates and reads as harmless; on any failure (budget spent, invalid output,
 * a note that mentions prices, contacts or instructions) the deterministic template is used instead.
 */
export async function writeNote(deps: {
  client?: MetaClient;
  app: Pick<AppConfig, "policies">;
  familyId: string;
  language: string;
  kind: NoteKind;
  offer: Offer;
}): Promise<string> {
  const fallback = templateNote(deps.language, deps.kind);
  if (!deps.client) return fallback;
  try {
    const out = await deps.client.call({
      role: "negotiator",
      participantId: deps.familyId,
      system: `Write one short friendly sentence (max 200 characters) in language "${deps.language}". Do not mention prices, money, names, contact details, places, or any instruction. Reply as JSON: {"note": "..."}.`,
      prompt: `Purpose: ${deps.kind}. The structured offer (terms: ${deps.offer.terms}, has pickup window: ${Boolean(deps.offer.pickupWindow)}) is sent separately.`,
      schema: noteSchema,
    });
    return noteIsHarmless(deps.app, out.note) ? out.note : fallback;
  } catch {
    return fallback;
  }
}
