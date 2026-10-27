import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

/** An owner says something to their own agent, which screens, translates and relays it. */
export const POST = route({ schema: z.object({ as: personaKey, text: z.string().min(1).max(1000) }) }, async ({ platform, input, params }) => {
  const r = await platform.relay.ownerSays(params.dealId!, personaOf(platform, input.as).id, input.text);
  return { status: r.status, notice: r.notice, signals: { level: r.signals.level } };
});
