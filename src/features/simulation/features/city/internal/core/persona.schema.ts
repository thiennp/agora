import type { AppConfig } from "@/lib/app-config";
import { hashSeed, pick, rng } from "./rng";

export const SIM_LABEL = "SIMULATED: synthetic families in a sandbox city; nothing here is real user data.";

export type Style = "brief" | "chatty" | "price-sensitive" | "generous";
export interface Window {
  from: string;
  to: string;
}

export interface SimFamily {
  id: string;
  name: string;
  language: string;
  district: string;
  /** Grid cell code in the synthetic geography, fixed for the family. */
  districtCode: string;
  profile: Record<string, string | number>;
  offerCategory: string;
  wantCategory: string;
  style: Style;
  /** Free hours for pickup, for some families, so scheduling questions arise. */
  availability: Window[];
}

export interface City {
  appId: string;
  synthetic: true;
  label: string;
  families: SimFamily[];
}

/** Districts are laid out on a synthetic map (steps of 0.05 degrees, about 3.4 to 5.6 km), so distances exist even though the sandbox files only name districts. */
const DISTRICT_OFFSETS: [number, number][] = [[0, 0], [1, 1], [1, -1], [-2, 0], [0, -3], [-1, 2], [2, 0], [-1, -2]];
const cell = (lat: number, lon: number) => `g:${lat.toFixed(2)}:${lon.toFixed(2)}`;

interface ParticipantFile {
  id: string; name: string; language: string; district: string; profile: Record<string, string | number>; offers: string[]; wants: string[];
}
interface PersonaFile {
  id: string; style: Style;
}

/** Build the sandbox city from the app's participants and personas (SIM-CTY-01). Deterministic for a seed. */
export function buildCity(app: Pick<AppConfig, "id">, participants: ParticipantFile[], personas: PersonaFile[], seed: number): City {
  const districts = [...new Set(participants.map((p) => p.district))];
  const styleOf = new Map(personas.map((p) => [p.id, p.style]));
  const families = participants.map((p, i): SimFamily => {
    const r = rng(hashSeed("family", seed, p.id));
    const [dy, dx] = DISTRICT_OFFSETS[districts.indexOf(p.district) % DISTRICT_OFFSETS.length]!;
    const jy = Math.floor(r() * 3) - 1;
    const jx = Math.floor(r() * 3) - 1;
    const hour = 9 + Math.floor(r() * 4);
    return {
      id: p.id, name: p.name, language: p.language, district: p.district,
      districtCode: cell(52.5 + (dy + jy) * 0.05, 13.4 + (dx + jx) * 0.05),
      profile: p.profile, offerCategory: p.offers[0]!, wantCategory: p.wants[0]!, style: styleOf.get(p.id) ?? pick(r, ["brief", "chatty", "price-sensitive", "generous"] as const),
      availability: i % 2 === 0 ? [{ from: `2026-11-02T${String(hour).padStart(2, "0")}:00:00.000Z`, to: `2026-11-02T${String(hour + 4).padStart(2, "0")}:00:00.000Z` }] : [],
    };
  });
  return { appId: app.id, synthetic: true, label: SIM_LABEL, families };
}
