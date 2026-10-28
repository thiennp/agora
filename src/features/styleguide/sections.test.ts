import { describe, expect, it } from "vitest";

import { SECTIONS } from "./sections";

describe("styleguide sections", () => {
  it("has unique ids that are safe as URL fragments", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z-]*$/);
  });

  it("gives every section a label", () => {
    for (const s of SECTIONS) expect(s.label.trim()).not.toBe("");
  });
});
