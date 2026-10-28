import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ as: personaKey, action: z.literal("forget"), id: z.string().min(1).max(100) }),
  z.object({ as: personaKey, action: z.literal("revoke"), id: z.string().min(1).max(100) }),
  z.object({ as: personaKey, action: z.literal("proposal"), id: z.string().min(1).max(100), accept: z.boolean() }),
  z.object({ as: personaKey, action: z.literal("stretch"), id: z.string().min(1).max(100), answer: z.enum(["yes", "no"]) }),
]);

/** "What I learned about you": delete a lesson, revoke a standing rule, answer a rule proposal or a stretch card. */
export const POST = route({ schema }, async ({ platform, input }) => {
  const me = personaOf(platform, input.as).id;
  if (input.action === "forget") return { ok: await platform.learning.forget(me, input.id) };
  if (input.action === "revoke") platform.book.revoke(me, input.id);
  else if (input.action === "proposal") {
    if (input.accept) platform.learning.acceptProposal(me, input.id);
    else platform.learning.dismissProposal(me, input.id);
  } else platform.learning.answerStretch(me, input.id, input.answer);
  return { ok: true };
});
