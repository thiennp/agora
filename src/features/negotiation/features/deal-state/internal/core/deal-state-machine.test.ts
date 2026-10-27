import { describe, expect, it } from "vitest";
import { createDeal, DEAL_STATES, IllegalTransitionError, isOpen, next, RoundLimitError, type DealEvent } from "./deal-state-machine";

const now = new Date("2026-10-27T12:00:00Z");
const mk = (maxRounds = 3) => createDeal({ id: "d1", appId: "a", offerItemId: "io", wantItemId: "iw", offerFamilyId: "fo", wantFamilyId: "fw", maxRounds, now });
const run = (events: DealEvent[], maxRounds = 3) => events.reduce((d, e) => next(d, e, now), mk(maxRounds));

describe("deal state machine", () => {
  it("walks the happy path to confirmed only when both owners confirm (NEG-STA-04)", () => {
    const agreed = run([{ type: "agree" }, { type: "open_cards" }]);
    expect(agreed.state).toBe("awaiting_owners");
    const one = next(agreed, { type: "owner_confirm", familyId: "fo" }, now);
    expect(one.state).toBe("awaiting_owners");
    const both = next(one, { type: "owner_confirm", familyId: "fw" }, now);
    expect(both.state).toBe("confirmed");
    expect(run([{ type: "agree" }, { type: "open_cards" }, { type: "owner_confirm", familyId: "fo" }, { type: "owner_confirm", familyId: "fo" }]).state).toBe("awaiting_owners");
  });

  it("allows 3 offers and refuses the 4th round (NEG-01)", () => {
    const d = run([{ type: "counter" }, { type: "counter" }]);
    expect(d.round).toBe(3);
    expect(() => next(d, { type: "counter" }, now)).toThrow(RoundLimitError);
  });

  it("alternates whose turn it is", () => {
    expect(mk().turnFamilyId).toBe("fo");
    expect(run([{ type: "counter" }]).turnFamilyId).toBe("fw");
    expect(run([{ type: "counter" }, { type: "counter" }]).turnFamilyId).toBe("fo");
  });

  it("pauses for the owner and resumes in the previous state, or declines", () => {
    const paused = run([{ type: "counter" }, { type: "ask_owner", familyId: "fo", topic: "price_terms", action: { x: 1 } }]);
    expect(paused.state).toBe("awaiting_owner_input");
    expect(next(paused, { type: "owner_answered", proceed: true }, now).state).toBe("countered");
    expect(next(paused, { type: "owner_answered", proceed: false }, now).state).toBe("declined");
  });

  it("rejects strangers confirming and every illegal move", () => {
    const awaiting = run([{ type: "agree" }, { type: "open_cards" }]);
    expect(() => next(awaiting, { type: "owner_confirm", familyId: "stranger" }, now)).toThrow(IllegalTransitionError);
    expect(() => next(mk(), { type: "owner_confirm", familyId: "fo" }, now)).toThrow(IllegalTransitionError);
    expect(() => next(mk(), { type: "start_handoff" }, now)).toThrow(IllegalTransitionError);
    const declined = run([{ type: "agents_decline", reason: "x" }]);
    for (const t of ["counter", "agree", "expire", "report", "owner_confirm"] as const) {
      expect(() => next(declined, { type: t, familyId: "fo" } as DealEvent, now)).toThrow(IllegalTransitionError);
    }
  });

  it("expires open deals only and records every transition with a time (NEG-STA-03)", () => {
    expect(run([{ type: "expire" }]).state).toBe("expired");
    const confirmed = run([{ type: "agree" }, { type: "open_cards" }, { type: "owner_confirm", familyId: "fo" }, { type: "owner_confirm", familyId: "fw" }]);
    expect(() => next(confirmed, { type: "expire" }, now)).toThrow();
    expect(confirmed.history.map((h) => h.to)).toEqual(["proposed", "agreed_by_agents", "awaiting_owners", "awaiting_owners", "confirmed"]);
    expect(confirmed.history.every((h) => h.at === now.toISOString())).toBe(true);
    expect(isOpen(mk())).toBe(true);
  });

  it("runs through handoff to completion and allows a late report", () => {
    const c = run([{ type: "agree" }, { type: "open_cards" }, { type: "owner_confirm", familyId: "fo" }, { type: "owner_confirm", familyId: "fw" }, { type: "start_handoff" }]);
    expect(next(c, { type: "handoff_done", ok: true }, now).state).toBe("completed");
    expect(next(c, { type: "handoff_done", ok: false }, now).state).toBe("not_completed");
    expect(next(next(c, { type: "handoff_done", ok: true }, now), { type: "report" }, now).state).toBe("reported");
  });

  it("never reaches confirmed without both confirmations, over thousands of random sequences (NEG-STA-02)", () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const evs: DealEvent[] = [
      { type: "counter" }, { type: "agree" }, { type: "open_cards" }, { type: "ask_owner", familyId: "fo", topic: "t", action: null },
      { type: "owner_answered", proceed: true }, { type: "owner_answered", proceed: false }, { type: "owner_confirm", familyId: "fo" },
      { type: "owner_confirm", familyId: "fw" }, { type: "owner_confirm", familyId: "x" }, { type: "owner_decline", familyId: "fo" },
      { type: "agents_decline", reason: "r" }, { type: "expire" }, { type: "start_handoff" }, { type: "handoff_done", ok: true }, { type: "report" },
    ];
    for (let run = 0; run < 3000; run++) {
      let d = mk();
      for (let step = 0; step < 12; step++) {
        try {
          d = next(d, evs[Math.floor(rnd() * evs.length)]!, now);
        } catch {
          /* illegal moves must throw and leave the deal unchanged */
        }
        expect(DEAL_STATES).toContain(d.state);
        if (["confirmed", "handoff", "completed", "not_completed"].includes(d.state) || d.history.some((h) => h.to === "confirmed")) {
          expect(d.confirmations.fo && d.confirmations.fw).toBe(true);
        }
        expect(d.round).toBeLessThanOrEqual(d.maxRounds);
      }
    }
  });
});
