import type { SamBox } from "@/lib/meta";

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const area = (b: Box) => Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
const union = (bs: Box[]): Box => ({ x1: Math.min(...bs.map((b) => b.x1)), y1: Math.min(...bs.map((b) => b.y1)), x2: Math.max(...bs.map((b) => b.x2)), y2: Math.max(...bs.map((b) => b.y2)) });

function iou(a: Box, b: Box): number {
  const i = area({ x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), x2: Math.min(a.x2, b.x2), y2: Math.min(a.y2, b.y2) });
  return i / (area(a) + area(b) - i || 1);
}

/**
 * Turn what SAM found for one concept into the boxes to crop. Boxes are scaled to the photo we kept, clamped inside it, and dropped when
 * unsure (confidence under 0.5), tiny (under 3% of a side) or a near-duplicate. If the label said there are several of the thing and SAM
 * found that many, each gets its own box; otherwise they are one item (a pair of boots found as two boxes is one pair) and share one.
 */
export function refineBoxes(found: SamBox[], size: { width: number; height: number }, quantity = 1): Box[] {
  const kept: Box[] = [];
  for (const f of found) {
    if (f.confidence !== undefined && f.confidence < 0.5) continue;
    const sx = f.width > 0 ? size.width / f.width : 1;
    const sy = f.height > 0 ? size.height / f.height : 1;
    const b: Box = {
      x1: Math.max(0, Math.round(Math.min(f.x1, f.x2) * sx)),
      y1: Math.max(0, Math.round(Math.min(f.y1, f.y2) * sy)),
      x2: Math.min(size.width, Math.round(Math.max(f.x1, f.x2) * sx)),
      y2: Math.min(size.height, Math.round(Math.max(f.y1, f.y2) * sy)),
    };
    if (b.x2 - b.x1 < size.width * 0.03 || b.y2 - b.y1 < size.height * 0.03) continue;
    if (kept.some((k) => iou(k, b) > 0.7)) continue;
    kept.push(b);
  }
  if (kept.length <= 1) return kept;
  return quantity > 1 && kept.length === quantity ? kept : [union(kept)];
}

/** A little room around the item so the crop is not cut tight; stays inside the photo. */
export function padBox(b: Box, size: { width: number; height: number }, fraction = 0.03): Box {
  const px = Math.round(size.width * fraction);
  const py = Math.round(size.height * fraction);
  return { x1: Math.max(0, b.x1 - px), y1: Math.max(0, b.y1 - py), x2: Math.min(size.width, b.x2 + px), y2: Math.min(size.height, b.y2 + py) };
}
