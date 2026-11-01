import { describe, expect, it } from "vitest";
import { assertCreator, assertHuman, assertSelf, createIdentityStore, IdentityError, MAX_MEMBERS_PER_APP, MAX_PAIRING_ATTEMPTS, PAIRING_TTL_MS, SESSION_TTL_MS, type IdentityBackend } from "./index";

const memoryBackend = (): IdentityBackend & { json: string | null } => {
  const b = { json: null as string | null, load: async () => b.json, save: async (j: string) => void (b.json = j) };
  return b;
};

describe("light identity store (BR-45)", () => {
  it("creates a membership with an unguessable id, a session and a recovery code", async () => {
    const ids = createIdentityStore();
    const a = await ids.join("club-a", "creator", "Ana");
    const b = await ids.join("club-a", "member", "Bo");
    expect(a.memberId).toMatch(/^[\w-]{22}$/); // 128 random bits
    expect(a.memberId).not.toBe(b.memberId);
    expect(a.sessionToken.length).toBeGreaterThanOrEqual(43); // 256 random bits
    expect(a.recoveryCode).toMatch(/^([A-Z2-9]{5}-){3}[A-Z2-9]{5}$/);
    expect(await ids.authenticate("club-a", a.sessionToken)).toEqual({ appId: "club-a", memberId: a.memberId, role: "creator", via: "session" });
    expect(await ids.authenticate("club-a", b.sessionToken)).toMatchObject({ memberId: b.memberId, role: "member" });
    expect((await ids.members("club-a")).map((m) => m.name)).toEqual(["Ana", "Bo"]);
    expect(JSON.stringify(await ids.members("club-a"))).not.toContain(a.sessionToken);
    expect(await ids.hasCreator("club-a")).toBe(true);
    expect(await ids.hasCreator("club-b")).toBe(false);
  });

  it("rejects a missing, forged, other-app, revoked or expired session", async () => {
    let t = 1_000;
    const ids = createIdentityStore(undefined, () => t);
    const a = await ids.join("club-a", "member");
    expect(await ids.authenticate("club-a", undefined)).toBeUndefined();
    expect(await ids.authenticate("club-a", "")).toBeUndefined();
    expect(await ids.authenticate("club-a", "x".repeat(43))).toBeUndefined();
    expect(await ids.authenticate("club-a", a.memberId)).toBeUndefined(); // the member id is not a secret and opens nothing
    expect(await ids.authenticate("club-b", a.sessionToken)).toBeUndefined(); // a session of another app
    await ids.revoke("club-b", a.sessionToken); // revoking through the wrong app does nothing
    expect(await ids.authenticate("club-a", a.sessionToken)).toBeDefined();
    await ids.revoke("club-a", a.sessionToken);
    expect(await ids.authenticate("club-a", a.sessionToken)).toBeUndefined();
    const b = await ids.join("club-a", "member");
    t += SESSION_TTL_MS;
    expect(await ids.authenticate("club-a", b.sessionToken)).toBeUndefined();
  });

  it("recovers on a new phone: old sessions end and the code changes", async () => {
    const ids = createIdentityStore();
    const a = await ids.join("club-a", "creator");
    const other = await ids.join("club-a", "member");
    const r = await ids.recover("club-a", a.recoveryCode.toLowerCase().replace(/-/g, " "));
    expect(r).toMatchObject({ memberId: a.memberId, role: "creator" });
    expect(await ids.authenticate("club-a", a.sessionToken)).toBeUndefined();
    expect(await ids.authenticate("club-a", r!.sessionToken)).toMatchObject({ memberId: a.memberId });
    expect(await ids.authenticate("club-a", other.sessionToken)).toBeDefined(); // nobody else is touched
    expect(r!.recoveryCode).not.toBe(a.recoveryCode);
    expect(await ids.recover("club-a", a.recoveryCode)).toBeUndefined(); // a used code is dead
    expect(await ids.recover("club-b", r!.recoveryCode)).toBeUndefined(); // another app's code
    expect(await ids.recover("club-a", "short")).toBeUndefined();
    expect(await ids.recover("club-a", "AAAAA-AAAAA-AAAAA-AAAAA")).toBeUndefined();
  });

  it("caps members per app", async () => {
    const small = createIdentityStore();
    for (let i = 0; i < MAX_MEMBERS_PER_APP; i++) await small.join("full", "member");
    await expect(small.join("full", "member")).rejects.toMatchObject({ code: "too_many_members" });
    await expect(small.join("other", "member")).resolves.toBeDefined();
  });

  it("stores only hashes and survives a restart", async () => {
    const backend = memoryBackend();
    const ids = createIdentityStore(backend);
    const a = await ids.join("club-a", "creator", "Ana");
    expect(backend.json).not.toContain(a.sessionToken);
    expect(backend.json).not.toContain(a.recoveryCode);
    expect(backend.json).not.toContain(a.recoveryCode.replace(/-/g, ""));
    const again = createIdentityStore(backend);
    expect(await again.authenticate("club-a", a.sessionToken)).toMatchObject({ memberId: a.memberId, role: "creator" });
    expect(await again.recover("club-a", a.recoveryCode)).toBeDefined();
  });

  it("authorizes by role, by self, and never lets an external Muse act", async () => {
    const creator = { appId: "a", memberId: "m1", role: "creator", via: "session" } as const;
    const member = { appId: "a", memberId: "m2", role: "member", via: "session" } as const;
    const muse = { ...member, via: "muse" } as const;
    expect(() => assertCreator(creator)).not.toThrow();
    expect(() => assertCreator(member)).toThrow(IdentityError);
    expect(() => assertSelf(member, "m2")).not.toThrow();
    expect(() => assertSelf(member, "m1")).toThrow(IdentityError);
    expect(() => assertSelf(creator, "m2")).toThrow(IdentityError); // the creator does not see another member's status page
    expect(() => assertHuman(member)).not.toThrow();
    expect(() => assertHuman(muse)).toThrow(/own session/);
  });
});

describe("sliding session expiry", () => {
  it("extends a session used past half its life, and still ends one left alone", async () => {
    let t = 1_000;
    const ids = createIdentityStore(undefined, () => t);
    const a = await ids.join("club-a", "member");
    t += SESSION_TTL_MS * 0.6;
    expect(await ids.authenticate("club-a", a.sessionToken)).toBeDefined(); // renews
    t += SESSION_TTL_MS * 0.6; // 1.2 lifetimes after sign-in, but only 0.6 since the renewal
    expect(await ids.authenticate("club-a", a.sessionToken)).toBeDefined();
    t += SESSION_TTL_MS + 1;
    expect(await ids.authenticate("club-a", a.sessionToken)).toBeUndefined();
  });
});

describe("pairing a new computer (QR or prompt)", () => {
  const setup = async () => {
    let t = 1_000;
    const ids = createIdentityStore(undefined, () => t);
    const a = await ids.join("club-a", "member", "Ana");
    return { ids, a, advance: (ms: number) => void (t += ms) };
  };

  it("signs the new computer in as the approving member, once, without cutting off the old device", async () => {
    const { ids, a } = await setup();
    const p = await ids.startPairing("club-a", "Chrome on Mac");
    expect(p.verify).toMatch(/^\d{4}$/);
    expect(await ids.claimPairing("club-a", p.code, p.secret)).toBe("pending");
    expect(await ids.pairingInfo("club-a", p.code)).toMatchObject({ label: "Chrome on Mac" });
    await ids.approvePairing("club-a", p.code, a.memberId, p.verify);
    const got = await ids.claimPairing("club-a", p.code, p.secret);
    expect(got).toMatchObject({ memberId: a.memberId, role: "member" });
    const token = (got as { sessionToken: string }).sessionToken;
    expect(token).not.toBe(a.sessionToken);
    expect(await ids.authenticate("club-a", token)).toMatchObject({ memberId: a.memberId });
    expect(await ids.authenticate("club-a", a.sessionToken)).toBeDefined(); // the old device stays signed in
    expect(await ids.claimPairing("club-a", p.code, p.secret)).toBeUndefined(); // works once
  });

  it("refuses the wrong secret, the wrong app, a stranger's member id and an ended request", async () => {
    const { ids, a, advance } = await setup();
    const other = await ids.join("club-b", "member");
    const p = await ids.startPairing("club-a");
    await expect(ids.approvePairing("club-b", p.code, other.memberId, p.verify)).rejects.toBeInstanceOf(IdentityError);
    await expect(ids.approvePairing("club-a", p.code, other.memberId, p.verify)).rejects.toBeInstanceOf(IdentityError); // member of another app
    await ids.approvePairing("club-a", p.code, a.memberId, p.verify);
    expect(await ids.claimPairing("club-a", p.code, "nope")).toBeUndefined();
    expect(await ids.claimPairing("club-b", p.code, p.secret)).toBeUndefined();
    const q = await ids.startPairing("club-a");
    advance(PAIRING_TTL_MS + 1);
    expect(await ids.pairingInfo("club-a", q.code)).toBeUndefined();
    await expect(ids.approvePairing("club-a", q.code, a.memberId, q.verify)).rejects.toBeInstanceOf(IdentityError);
    expect(await ids.claimPairing("club-a", q.code, q.secret)).toBeUndefined();
  });

  it("burns a request after too many wrong digits, so a photographed QR cannot be brute forced", async () => {
    const { ids, a } = await setup();
    const p = await ids.startPairing("club-a");
    const wrong = p.verify === "0000" ? "1111" : "0000";
    for (let i = 0; i < MAX_PAIRING_ATTEMPTS; i++) await expect(ids.approvePairing("club-a", p.code, a.memberId, wrong)).rejects.toBeInstanceOf(IdentityError);
    await expect(ids.approvePairing("club-a", p.code, a.memberId, p.verify)).rejects.toBeInstanceOf(IdentityError);
    expect(await ids.claimPairing("club-a", p.code, p.secret)).toBeUndefined();
  });

  it("stores only hashes of the code and the secret", async () => {
    const backend = memoryBackend();
    const ids = createIdentityStore(backend);
    const a = await ids.join("club-a", "member");
    const p = await ids.startPairing("club-a");
    await ids.approvePairing("club-a", p.code, a.memberId, p.verify);
    expect(backend.json).not.toContain(p.code);
    expect(backend.json).not.toContain(p.secret);
  });
});
