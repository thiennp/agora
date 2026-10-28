import { z } from "zod";

/** What the vision model must answer for one photo. Anything outside this shape is rejected and retried once by the Meta client. */
export const photoLabelsSchema = z.object({
  photo: z.enum(["ok", "too_dark", "blurry", "no_items"]),
  items: z
    .array(
      z.object({
        name: z.string().max(80),
        /** One short noun phrase SAM can find ("rain boots"). */
        concept: z.string().min(1).max(40),
        category: z.string().max(40),
        size: z.string().max(20).nullish(),
        condition: z.string().max(20).nullish(),
        quantity: z.number().int().min(1).max(10).default(1),
        confidence: z.number().min(0).max(1).default(0.5),
        showsPerson: z.boolean().default(false),
        showsReadableText: z.boolean().default(false),
      }),
    )
    .max(30),
});
export type PhotoLabels = z.infer<typeof photoLabelsSchema>;
export type PhotoItemLabel = PhotoLabels["items"][number];
