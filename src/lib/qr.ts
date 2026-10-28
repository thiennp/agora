import qrcode from "qrcode-generator";

/** A QR code as one SVG path in module units: draw `d` on a `size` x `size` grid with a white quiet zone already included. */
export type QrCode = { size: number; d: string };

const QUIET_ZONE = 4;

/** Encodes text (a URL) with error correction M; the version is the smallest that fits. Pure and deterministic, no network. */
export function makeQr(text: string): QrCode {
  if (!text) throw new Error("makeQr needs text");
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!qr.isDark(y, x)) { x++; continue; }
      let run = 1;
      while (x + run < n && qr.isDark(y, x + run)) run++;
      d += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return { size: n + QUIET_ZONE * 2, d };
}
