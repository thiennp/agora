import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { checkPhotoQuality, cutCrop, normalizePhoto, UnreadablePhotoError } from "./cut-crops";

/** A busy, bright picture: noise everywhere, so it is neither dark nor blurry. */
export const busyPhoto = (width = 800, height = 600) =>
  sharp({ create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 60 } } }).jpeg().toBuffer();

describe("normalizePhoto", () => {
  it("shrinks a big photo, keeps the proportions, and drops camera metadata", async () => {
    const big = await sharp(await busyPhoto(3200, 2400)).withExif({ IFD0: { Copyright: "private-owner" } }).withMetadata({ orientation: 1 }).jpeg().toBuffer();
    expect((await sharp(big).metadata()).exif).toBeTruthy();
    const photo = await normalizePhoto(big);
    expect([photo.width, photo.height]).toEqual([1600, 1200]);
    const meta = await sharp(photo.jpeg).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe("jpeg");
  });
  it("turns a rotated photo upright", async () => {
    const sideways = await sharp(await busyPhoto(400, 200)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const photo = await normalizePhoto(sideways);
    expect([photo.width, photo.height]).toEqual([200, 400]);
  });
  it("refuses something that is not a picture", async () => {
    await expect(normalizePhoto(Buffer.from("not a photo at all"))).rejects.toBeInstanceOf(UnreadablePhotoError);
  });
});

describe("checkPhotoQuality", () => {
  it("passes a busy bright photo", async () => {
    expect(await checkPhotoQuality(await busyPhoto())).toBe("ok");
  });
  it("catches a dark photo", async () => {
    const dark = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 8, g: 8, b: 8 } } }).jpeg().toBuffer();
    expect(await checkPhotoQuality(dark)).toBe("too_dark");
  });
  it("catches a blurry photo", async () => {
    const blurry = await sharp(await busyPhoto()).blur(25).jpeg().toBuffer();
    expect(await checkPhotoQuality(blurry)).toBe("blurry");
  });
});

describe("cutCrop", () => {
  it("returns only the boxed part, small, as a JPEG data URL", async () => {
    const jpeg = await busyPhoto(1600, 1200);
    const url = await cutCrop(jpeg, { x1: 100, y1: 100, x2: 900, y2: 500 });
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
    const meta = await sharp(Buffer.from(url.split(",")[1]!, "base64")).metadata();
    expect([meta.width, meta.height]).toEqual([480, 240]);
  });
});
