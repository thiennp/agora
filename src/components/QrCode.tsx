import { makeQr } from "@/lib/qr";

/** A QR code drawn as SVG. Always black on white (with its own quiet zone), also in dark mode, so phone cameras read it. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const { size, d } = makeQr(text);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
