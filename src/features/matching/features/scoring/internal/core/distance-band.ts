export type DistanceBand = "same" | "near" | "mid" | "far" | "unknown";

const CELL = 0.05;
const R_KM = 6371;

/** Centre of a grid-cell code ("g:lat:lon"), or null for name-based codes. */
function cellCentre(code: string): { lat: number; lon: number } | null {
  const m = /^g:(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/.exec(code);
  return m ? { lat: Number(m[1]) + CELL / 2, lon: Number(m[2]) + CELL / 2 } : null;
}

/** Distance between two district codes in km; 0 for the same code; null when it cannot be known (different named districts). */
export function districtDistanceKm(a: string, b: string): number | null {
  if (a === b) return 0;
  const A = cellCentre(a);
  const B = cellCentre(b);
  if (!A || !B) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(B.lat - A.lat) / 2) ** 2 +
    Math.cos(rad(A.lat)) * Math.cos(rad(B.lat)) * Math.sin(rad(B.lon - A.lon) / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function distanceBand(km: number | null): DistanceBand {
  if (km === null) return "unknown";
  if (km === 0) return "same";
  if (km <= 5) return "near";
  if (km <= 15) return "mid";
  return "far";
}
