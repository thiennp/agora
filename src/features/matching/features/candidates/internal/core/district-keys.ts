const CELL = 0.05;
const idx = (v: number) => Math.round(v / CELL);
const key = (i: number) => (i * CELL).toFixed(2);

/**
 * Index keys to look in: the district itself, plus the surrounding grid cells within `radiusKm`.
 * Named districts have no geometry, so they only look in their own key.
 */
export function districtKeys(code: string, radiusKm: number): string[] {
  const m = /^g:(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/.exec(code);
  if (!m) return [code];
  const steps = Math.max(0, Math.ceil(radiusKm / 5.5));
  const [la, lo] = [idx(Number(m[1])), idx(Number(m[2]))];
  const keys: string[] = [];
  for (let dy = -steps; dy <= steps; dy++) for (let dx = -steps; dx <= steps; dx++) keys.push(`g:${key(la + dy)}:${key(lo + dx)}`);
  return keys;
}
