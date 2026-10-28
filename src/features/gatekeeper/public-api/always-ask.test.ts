import { describe, expect, it } from "vitest";
import { ALWAYS_ASK } from "../features/policy/public-api/infrastructure";
import { ALWAYS_ASK_TOPICS } from "@/lib/app-config";

describe("always-ask topics", () => {
  it("are one list: the gatekeeper uses the schema's, and the core six are present (BR-07)", () => {
    expect([...ALWAYS_ASK].sort()).toEqual([...ALWAYS_ASK_TOPICS].sort());
    for (const t of ["commitment", "price_terms", "identity_reveal", "location_reveal", "shipping_choice", "safety_exception"]) {
      expect(ALWAYS_ASK_TOPICS as readonly string[]).toContain(t);
    }
  });
});
