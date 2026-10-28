import type { SamBox, SamClient } from "@/lib/meta";

export interface Located {
  boxes: SamBox[];
  /** The SAM request itself failed (as opposed to finding nothing). */
  failed: boolean;
}

/**
 * Ask SAM 3.1 for each concept in parallel (one concept per request; an empty concept is skipped). SAM returns nothing for some phrases
 * it finds under a simpler word ("board book" no, "book" yes), so a multi-word concept that found nothing is tried once more as its last
 * word. One failing request only costs that item its outline.
 */
export async function locateItems(o: { sam: SamClient; image: string; concepts: string[] }): Promise<Located[]> {
  const one = async (concept: string): Promise<SamBox[]> => {
    if (!concept) return [];
    const boxes = await o.sam.find(o.image, concept);
    const head = concept.trim().split(/\s+/).at(-1)!;
    return boxes.length === 0 && head !== concept.trim() ? o.sam.find(o.image, head) : boxes;
  };
  const settled = await Promise.allSettled(o.concepts.map(one));
  return settled.map((s) => (s.status === "fulfilled" ? { boxes: s.value, failed: false } : { boxes: [], failed: true }));
}
