/** Grid size in degrees: 0.05 is about 5.5 km north-south, enough to match neighbours but not to find a street. */
const CELL = 0.05;

/** Coarse code from coordinates. The input is rounded away, so the result cannot be reversed to an address (FAM-PRO-02). */
export function districtFromCoords(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error("invalid coordinates");
  }
  const cell = (v: number) => (Math.floor(v / CELL) * CELL).toFixed(2);
  return `g:${cell(lat)}:${cell(lon)}`;
}

/** Coarse code from a district or neighbourhood name the owner typed. */
export function districtFromName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("district name is empty");
  // A street-like entry ("12 Oak Street") is not a district: refuse rather than store it.
  if (/\d/.test(slug)) throw new Error("enter a district or neighbourhood, not an address");
  return `n:${slug}`;
}

type DistrictInput = { lat: number; lon: number } | { name: string };

export function toDistrictCode(input: DistrictInput): string {
  return "name" in input ? districtFromName(input.name) : districtFromCoords(input.lat, input.lon);
}
