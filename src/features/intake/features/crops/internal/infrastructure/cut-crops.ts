import sharp from "sharp";
import type { Box } from "../../../segmentation/public-api/types";

export const MAX_SIDE = 1600;
export const CROP_SIDE = 480;

export interface Photo {
  /** The working copy: rotated upright, at most MAX_SIDE on the long side, re-encoded as JPEG so camera metadata (location, time, device) is gone. */
  jpeg: Buffer;
  width: number;
  height: number;
}

export class UnreadablePhotoError extends Error {
  constructor() {
    super("unreadable photo");
    this.name = "UnreadablePhotoError";
  }
}

/** Decode any common photo format, apply its rotation, shrink it and drop all metadata. */
export async function normalizePhoto(input: Buffer): Promise<Photo> {
  try {
    const { data, info } = await sharp(input, { failOn: "error" }).rotate().resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
    return { jpeg: data, width: info.width, height: info.height };
  } catch {
    throw new UnreadablePhotoError();
  }
}

/**
 * Cheap checks on the pixels themselves, so a bad photo gets a retake prompt before any model is paid for (INT-05): too dark by mean
 * brightness, blurry by how much a Laplacian edge filter varies on a small grey copy.
 */
export async function checkPhotoQuality(jpeg: Buffer): Promise<"ok" | "too_dark" | "blurry"> {
  const grey = sharp(jpeg).resize(512, 512, { fit: "inside" }).greyscale();
  const { channels } = await grey.clone().stats();
  if (channels[0]!.mean < 35) return "too_dark";
  const edges = await grey.clone().convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], scale: 1, offset: 128 }).stats();
  return edges.channels[0]!.stdev < 4 ? "blurry" : "ok";
}

/** Cut one item out by its box, shrink it, and return it as a JPEG data URL. The only image that is kept. */
export async function cutCrop(jpeg: Buffer, box: Box): Promise<string> {
  const out = await sharp(jpeg)
    .extract({ left: box.x1, top: box.y1, width: box.x2 - box.x1, height: box.y2 - box.y1 })
    .resize(CROP_SIDE, CROP_SIDE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}
