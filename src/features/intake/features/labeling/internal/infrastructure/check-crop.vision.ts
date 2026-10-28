import { z } from "zod";
import type { MetaClient } from "@/lib/meta";

const cropCheckSchema = z.object({ showsPerson: z.boolean(), showsReadableText: z.boolean() });
export type CropCheck = { person: boolean; text: boolean };

const INSTRUCTIONS = [
  "You are the last privacy check before a picture of an item is kept. Look only at this picture.",
  'Reply with one JSON object: {"showsPerson": boolean, "showsReadableText": boolean}.',
  '"showsPerson" is true if any part of a human can be seen, even small or at the edge: face, eye, hand, finger, arm, leg, hair, skin.',
  '"showsReadableText" is true if a person\'s name, a street address or a phone number can be read. Brand names, book titles and single words are fine.',
  "When unsure, answer true.",
].join("\n");

/** A second, separate look at each finished crop (INT-CRP-04): the first look is the labeling call, which sees the whole photo at once. */
export async function checkCrop(o: { client: MetaClient; image: string; participantId: string }): Promise<CropCheck> {
  const r = await o.client.call({ role: "intake", participantId: o.participantId, system: INSTRUCTIONS, prompt: "Check this picture.", images: [o.image], schema: cropCheckSchema });
  return { person: r.showsPerson, text: r.showsReadableText };
}
