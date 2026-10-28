import type { SamBox, SamClient } from "@/lib/meta";

export interface Located {
  boxes: SamBox[];
  /** The SAM request itself failed (as opposed to finding nothing). */
  failed: boolean;
}

/** Ask SAM 3.1 for each concept in parallel (one concept per request; an empty concept is skipped). One failing request only costs that item its outline. */
export async function locateItems(o: { sam: SamClient; image: string; concepts: string[] }): Promise<Located[]> {
  const settled = await Promise.allSettled(o.concepts.map((c) => (c ? o.sam.find(o.image, c) : Promise.resolve([]))));
  return settled.map((s) => (s.status === "fulfilled" ? { boxes: s.value, failed: false } : { boxes: [], failed: true }));
}
