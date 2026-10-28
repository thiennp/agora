import { randomUUID } from "node:crypto";
import { BudgetExceededError } from "@/lib/meta";
import { checkPhotoQuality, createCropStore, cutCrop, normalizePhoto, withOriginal } from "../../features/crops/public-api/infrastructure";
import type { CropStore } from "../../features/crops/public-api/types";
import { normalizeSize } from "../../features/labeling/public-api/infrastructure";
import { padBox, refineBoxes } from "../../features/segmentation/public-api/infrastructure";
import type { IntakeDraft, IntakeResult } from "../../public-api/types";
import type { Catalog, IntakePorts } from "./ports";

export const MAX_ITEMS = 8;
const LOW_CONFIDENCE = 0.7;

const RETAKE = {
  too_dark: "That photo is too dark to see the items. Try again in better light.",
  blurry: "That photo is blurry. Hold the phone steady and try again.",
  no_items: "I could not see anything to pass on. Lay the items flat, apart from each other, and try again.",
} as const;

/**
 * Photo to item drafts (INT-01). Steps: shrink the photo and drop its metadata, refuse a dark or blurry one, have the vision model name
 * the items, have SAM 3.1 find each one, cut a crop per item from its box, keep only the crops. The original bytes are overwritten with
 * zeros as soon as the shrunk copy exists, and the shrunk copy before the call returns (INT-02, INT-CRP-02). A person or readable text
 * in an item's area means no picture is kept for that item (INT-CRP-04). Nothing here throws at the owner: failures come back as a
 * status the page can explain, and the items form always still works (INT-SEG-03).
 */
export function createIntake(deps: { catalog: Catalog; ports: IntakePorts; crops?: CropStore }) {
  const crops = deps.crops ?? createCropStore();
  const { catalog, ports } = deps;
  const categoryIds = new Set(catalog.categories.map((c) => c.id));

  async function analyze(ownerId: string, bytes: Buffer): Promise<IntakeResult> {
    return withOriginal(bytes, async (original) => {
      let photo;
      try {
        photo = await normalizePhoto(original);
      } catch {
        return { status: "unreadable", message: "I could not read that file. Use a JPEG, PNG or WebP photo." };
      }
      original.fill(0);
      try {
        const bad = await checkPhotoQuality(photo.jpeg);
        if (bad !== "ok") return { status: "retake", reason: bad, message: RETAKE[bad] };

        const image = `data:image/jpeg;base64,${photo.jpeg.toString("base64")}`;
        let labels;
        try {
          labels = await ports.label(image, ownerId);
        } catch (e) {
          if (!(e instanceof BudgetExceededError)) console.error("intake label failed", e instanceof Error ? e.name : typeof e);
          return { status: "unavailable", message: "The photo helper is not available right now. You can add the items by hand below." };
        }
        if (labels.photo !== "ok") return { status: "retake", reason: labels.photo, message: RETAKE[labels.photo] };
        const seen = labels.items;
        if (seen.length === 0) return { status: "retake", reason: "no_items", message: RETAKE.no_items };
        const items = seen.slice(0, MAX_ITEMS);

        const needsOutline = items.map((i) => !i.showsPerson && !i.showsReadableText);
        const located = await ports.locate(image, items.map((i, n) => (needsOutline[n] ? i.concept : "")), photo);

        const drafts: IntakeDraft[] = [];
        for (const [n, item] of items.entries()) {
          const validCategory = categoryIds.has(item.category);
          const category = validCategory ? item.category : catalog.categories[0]!.id;
          const sizes = catalog.sizeSystems[category];
          const size = normalizeSize(item.size, sizes);
          const condition = item.condition && catalog.conditions.includes(item.condition) ? item.condition : undefined;
          const base = {
            name: item.name.trim() || item.concept,
            category,
            ...(size ? { size } : {}),
            ...(condition ? { condition } : {}),
            confidence: item.confidence,
            needsCheck: !validCategory || item.confidence < LOW_CONFIDENCE || Boolean(sizes?.length && !size),
          };
          if (item.showsPerson || item.showsReadableText) {
            drafts.push({ id: randomUUID(), ...base, needsCheck: true, noCropReason: item.showsPerson ? "person" : "text" });
            continue;
          }
          const boxes = refineBoxes(located[n]?.boxes ?? [], photo, item.quantity);
          if (boxes.length === 0) {
            drafts.push({ id: randomUUID(), ...base, needsCheck: true, noCropReason: "no_outline" });
            continue;
          }
          for (const [k, box] of boxes.entries()) {
            const id = randomUUID();
            const crop = await cutCrop(photo.jpeg, padBox(box, photo));
            crops.holdDraft(ownerId, id, crop);
            drafts.push({ id, ...base, name: boxes.length > 1 ? `${base.name} (${k + 1} of ${boxes.length})` : base.name, crop });
          }
        }
        return { status: "ok", drafts, capped: seen.length > MAX_ITEMS, simulated: ports.simulated };
      } finally {
        photo.jpeg.fill(0);
      }
    });
  }

  return { analyze, crops, simulated: ports.simulated };
}
export type Intake = ReturnType<typeof createIntake>;
