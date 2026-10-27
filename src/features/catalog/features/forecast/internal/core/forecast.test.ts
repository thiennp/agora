import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createForecastService, forecast } from "./forecast";

const HEALTH = /(health|milestone|sleep|feed|develop|growth|doctor|medical)/i;

describe("forecast", () => {
  it("suggests from the stage for a 6-month profile (kids-gear)", async () => {
    const app = await loadApp("kids-gear");
    const s = forecast(app, { "baby-age-months": 6, sizes: "68" }, new Date());
    expect(s.filter((x) => x.kind === "outgrown").map((x) => x.category)).toEqual(["clothing", "car-seat"]);
    expect(s.filter((x) => x.kind === "needed").map((x) => x.category)).toEqual(["clothing", "toys", "furniture"]);
  });

  it("uses the month of year for cyclic apps and wraps winter (garden-tools)", async () => {
    const app = await loadApp("garden-tools");
    const jan = forecast(app, {}, new Date(2026, 0, 15));
    const apr = forecast(app, {}, new Date(2026, 3, 15));
    expect(jan.every((s) => s.stageId === "cool-season")).toBe(true);
    expect(apr.some((s) => s.stageId === "spring")).toBe(true);
  });

  it("returns nothing when the profile cannot place the participant", async () => {
    const app = await loadApp("kids-gear");
    expect(forecast(app, { sizes: "68" }, new Date())).toEqual([]);
  });

  it("frames every suggestion as logistics, never health or development (CAT-FOR-02)", async () => {
    for (const id of ["kids-gear", "garden-tools"]) {
      const app = await loadApp(id);
      for (const m of [0, 3, 6, 9]) {
        for (const s of forecast(app, { "baby-age-months": m * 2 + 1 }, new Date(2026, m, 1))) expect(s.text).not.toMatch(HEALTH);
      }
    }
  });

  it("remembers dismissals per family (CAT-FOR-03)", async () => {
    const app = await loadApp("kids-gear");
    const svc = createForecastService({ app });
    const profile = { "baby-age-months": 6, sizes: "68" };
    const first = svc.suggest("f1", profile);
    svc.dismiss("f1", first[0]!.id);
    expect(svc.suggest("f1", profile).map((s) => s.id)).not.toContain(first[0]!.id);
    expect(svc.suggest("f2", profile)).toHaveLength(first.length);
  });
});
