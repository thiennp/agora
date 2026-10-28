import type { AppConfig } from "@/lib/app-config";
import type { MetaClient, SamClient } from "@/lib/meta";
import { checkCrop, labelPhoto, type CropCheck } from "../../features/labeling/public-api/infrastructure";
import type { PhotoLabels } from "../../features/labeling/public-api/types";
import { locateItems } from "../../features/segmentation/public-api/infrastructure";
import type { Located } from "../../features/segmentation/public-api/types";

export type Catalog = Pick<AppConfig["catalog"], "categories" | "sizeSystems" | "conditions">;

/** The two model steps the pipeline needs. `image` is always a data URL of the shrunk working copy. */
export interface IntakePorts {
  /** True when no model looks at the photo (demo mode); the owner is told. */
  simulated: boolean;
  label(image: string, ownerId: string): Promise<PhotoLabels>;
  locate(image: string, concepts: string[], size: { width: number; height: number }): Promise<Located[]>;
  /** A separate look at a finished crop (a data URL): does a person or readable text show? A throw counts as "could not check". */
  checkCrop(image: string, ownerId: string): Promise<CropCheck>;
}

/** Real models: Muse Spark names the items, SAM 3.1 finds each one. */
export function createMetaPorts(o: { client: MetaClient; sam: SamClient; catalog: Catalog }): IntakePorts {
  return {
    simulated: false,
    label: (image, ownerId) => labelPhoto({ client: o.client, catalog: o.catalog, image, participantId: ownerId }),
    locate: (image, concepts) => locateItems({ sam: o.sam, image, concepts }),
    checkCrop: (image, ownerId) => checkCrop({ client: o.client, image, participantId: ownerId }),
  };
}

// Three fixed places on the photo, as fractions of its width and height.
const SLOTS = [
  [0.04, 0.04, 0.5, 0.55],
  [0.54, 0.04, 0.96, 0.5],
  [0.1, 0.6, 0.9, 0.96],
] as const;

/**
 * Offline stand-in for demo mode: no model looks at the photo. It "finds" up to three sample items, one per category of the app,
 * at three fixed places on the photo, always marked low confidence so the owner must check each (docs/ARCHITECTURE.md section 13). Its crop check always says clear: nothing looks at the picture.
 */
export function createSimulatedPorts(catalog: Catalog): IntakePorts {
  const picks = catalog.categories.slice(0, 3);
  return {
    simulated: true,
    async label() {
      return {
        photo: "ok",
        items: picks.map((c) => ({ name: c.hints[0] ?? c.label, concept: c.hints[0] ?? c.label, category: c.id, size: null, condition: null, quantity: 1, confidence: 0.5, showsPerson: false, showsReadableText: false })),
      };
    },
    async checkCrop() {
      return { person: false, text: false };
    },
    async locate(_image, concepts, size) {
      return concepts.map((_c, i) => {
        const [x1, y1, x2, y2] = SLOTS[i % SLOTS.length]!;
        return { failed: false, boxes: [{ x1: Math.round(x1 * size.width), y1: Math.round(y1 * size.height), x2: Math.round(x2 * size.width), y2: Math.round(y2 * size.height), width: size.width, height: size.height, confidence: 1 }] };
      });
    },
  };
}
