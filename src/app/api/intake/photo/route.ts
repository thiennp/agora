import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

// The page shrinks the photo before sending (and drops its camera metadata); the limit is a backstop for other callers.
const schema = z.object({
  as: personaKey,
  image: z.string().max(8_000_000).regex(/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/, "image must be a JPEG, PNG, WebP or GIF data URL"),
});

/**
 * Turn a photo into item drafts. The photo is read in memory and never stored: only the item pictures come back, and they wait here
 * (30 minutes) for the owner to list them. Failures are answered as a status (retake, unreadable, unavailable), never an error page.
 */
export const POST = route({ schema }, async ({ platform, input }) => {
  const me = personaOf(platform, input.as);
  return platform.intake.analyze(me.id, Buffer.from(input.image.slice(input.image.indexOf(",") + 1), "base64"));
});
