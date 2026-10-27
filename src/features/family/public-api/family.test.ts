import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createFamilyService, ProfileValidationError } from "./infrastructure";

const garden = { language: "es", district: { name: "Hyde Park" }, profile: { "garden-size": "small", grows: "tomatoes" } };
const kids = { language: "de", district: { lat: 52.52, lon: 13.405 }, profile: { "baby-age-months": 7, sizes: "68" } };

async function svc(id = "garden-tools") {
  const audit: unknown[] = [];
  return { audit, family: createFamilyService({ app: await loadApp(id), audit: (e: unknown) => audit.push(e) }) };
}

describe("family service", () => {
  it("creates a profile for any app from its config fields", async () => {
    const g = await svc("garden-tools");
    const rec = await g.family.profiles.create(garden);
    expect(rec).toMatchObject({ appId: "garden-tools", districtCode: "n:hyde-park", language: "es" });
    const k = await svc("kids-gear");
    expect((await k.family.profiles.create(kids)).districtCode).toMatch(/^g:52\.50:13\.40$/);
  });

  it("rejects missing, extra and wrong-typed fields with plain messages", async () => {
    const { family } = await svc("garden-tools");
    await expect(family.profiles.create({ ...garden, profile: { grows: "x" } })).rejects.toBeInstanceOf(ProfileValidationError);
    await expect(family.profiles.create({ ...garden, profile: { ...garden.profile, sleep: "8h" } })).rejects.toThrow();
    await expect(family.profiles.create({ ...garden, language: "fr" })).rejects.toThrow();
    const k = await svc("kids-gear");
    await expect(k.family.profiles.create({ ...kids, profile: { ...kids.profile, "baby-age-months": "7" } })).rejects.toThrow();
  });

  it("never stores an address-like district", async () => {
    const { family } = await svc();
    await expect(family.profiles.create({ ...garden, district: { name: "12 Oak Street" } })).rejects.toThrow();
  });

  it("refuses an app that asks for health data (FAM-05)", async () => {
    const app = await loadApp("garden-tools");
    const bad = { ...app, participant: { ...app.participant, fields: [{ id: "sleep-hours", label: "Sleep", type: "number" as const }] } };
    const family = createFamilyService({ app: bad });
    await expect(family.profiles.create({ language: "en", district: { name: "x" }, profile: { "sleep-hours": 8 } })).rejects.toThrow(/health/);
  });

  it("lets the owner edit, export and erase everything (FAM-03)", async () => {
    const { family } = await svc();
    const rec = await family.profiles.create(garden);
    family.consent.grant(rec.id, "share_items");
    const updated = await family.profiles.update(rec.id, { ...garden, profile: { ...garden.profile, grows: "herbs" } });
    expect(updated.profile.grows).toBe("herbs");
    const exported = await family.export(rec.id);
    expect(exported?.family.id).toBe(rec.id);
    expect(exported?.consent).toHaveLength(1);
    expect(await family.erase(rec.id)).toBe(true);
    expect(await family.profiles.get(rec.id)).toBeNull();
    expect(family.consent.history(rec.id)).toEqual([]);
  });

  it("keeps consent off by default, opt-in, withdrawable and audited", async () => {
    const { family, audit } = await svc();
    const rec = await family.profiles.create(garden);
    expect(family.consent.canShare(rec.id)).toBe(false);
    expect(family.consent.has(rec.id, "learning_commons")).toBe(false);
    family.consent.grant(rec.id, "share_items");
    expect(family.consent.canShare(rec.id)).toBe(true);
    family.consent.withdraw(rec.id, "share_items");
    expect(family.consent.canShare(rec.id)).toBe(false);
    expect(audit).toHaveLength(2);
  });
});
