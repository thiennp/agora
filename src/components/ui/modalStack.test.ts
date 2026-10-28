import { describe, expect, it } from "vitest";

import { anyOpen, isTop, register, unregister } from "./modalStack";

describe("modalStack", () => {
  it("lets only the most recently opened dialog be on top", () => {
    const first = Symbol("first");
    const second = Symbol("second");
    expect(anyOpen()).toBe(false);

    register(first);
    expect(isTop(first)).toBe(true);
    register(second);
    expect(isTop(first)).toBe(false);
    expect(isTop(second)).toBe(true);

    unregister(second);
    expect(isTop(first)).toBe(true);
    unregister(first);
    expect(anyOpen()).toBe(false);
  });

  it("ignores ids it does not know", () => {
    unregister(Symbol("never opened"));
    expect(anyOpen()).toBe(false);
  });
});
