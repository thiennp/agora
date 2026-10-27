const CELL = 0.05;
const KM_PER_DEG = 111.32;
const idx = (v: number) => Math.round(v / CELL);
const key = (i: number) => (i * CELL).toFixed(2);

/**
 * Index keys to look in: the district itself, plus the surrounding grid cells within `radiusKm`.
 * A cell is 0.05 degrees tall (about 5.6 km) but narrower east-west away from the equator, so the number of steps is worked
 * out separately for each direction; otherwise candidates inside the radius would be missed at higher latitudes.
 * Named districts have no geometry, so they only look in their own key.
 */
export function districtKeys(code: string, radiusKm: number): string[] {
  const m = /^g:(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/.exec(code);
  if (!m) return [code];
  const lat = Number(m[1]);
  const [la, lo] = [idx(lat), idx(Number(m[2]))];
  const cellKmNorth = CELL * KM_PER_DEG;
  // Use the cell edge nearest the poles, where it is narrowest, so no candidate in range is skipped.
  const cellKmEast = CELL * KM_PER_DEG * Math.max(Math.cos(((Math.abs(lat) + CELL) * Math.PI) / 180), 0.05);
  const stepsLat = Math.max(0, Math.ceil(radiusKm / cellKmNorth)) + 1;
  const stepsLon = Math.max(0, Math.ceil(radiusKm / cellKmEast)) + 1;
  const keys: string[] = [];
  for (let dy = -stepsLat; dy <= stepsLat; dy++) for (let dx = -stepsLon; dx <= stepsLon; dx++) keys.push(`g:${key(la + dy)}:${key(lo + dx)}`);
  return keys;
}
