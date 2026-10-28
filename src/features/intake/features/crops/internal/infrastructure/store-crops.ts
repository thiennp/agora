const DRAFT_TTL_MS = 30 * 60_000;
const MAX_DRAFTS = 60;

/**
 * Holds the item pictures: first as drafts waiting for the owner to list them, then attached to the item they became. Deliberately
 * NOT in the saved demo state (src/lib/state.ts): pictures are large, so after a restart items keep working and just show no picture.
 */
export function createCropStore(now: () => number = Date.now) {
  const drafts = new Map<string, { ownerId: string; crop: string; at: number }>();
  const items = new Map<string, string>();

  function sweep() {
    for (const [id, d] of drafts) if (now() - d.at > DRAFT_TTL_MS) drafts.delete(id);
    while (drafts.size > MAX_DRAFTS) drafts.delete(drafts.keys().next().value!);
  }

  return {
    holdDraft(ownerId: string, draftId: string, crop: string) {
      drafts.set(draftId, { ownerId, crop, at: now() });
      sweep();
    },
    /** Move a draft's picture to the item it became. Only its owner can; returns whether it moved. */
    claim(ownerId: string, draftId: string, itemId: string): boolean {
      sweep();
      const d = drafts.get(draftId);
      if (!d || d.ownerId !== ownerId) return false;
      drafts.delete(draftId);
      items.set(itemId, d.crop);
      return true;
    },
    forItem: (itemId: string) => items.get(itemId),
    removeItem: (itemId: string) => void items.delete(itemId),
    counts: () => ({ drafts: drafts.size, items: items.size }),
  };
}
export type CropStore = ReturnType<typeof createCropStore>;
