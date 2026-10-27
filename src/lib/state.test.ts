import { describe, expect, it } from "vitest";
import { createStateScope, tracked, withScope } from "./state";

describe("tracked state", () => {
  it("returns the value untouched outside a scope", () => {
    const m = new Map([["a", 1]]);
    expect(tracked("x", m)).toBe(m);
  });

  it("round-trips maps, sets, arrays, objects and nesting, refilling in place", () => {
    const build = () => {
      const scope = createStateScope();
      return withScope(scope, () => ({
        scope,
        rows: tracked("rows", new Map<string, { n: number; tags: Set<string> }>()),
        nested: tracked("nested", new Map<string, Map<string, number>>()),
        list: tracked("list", [] as string[]),
        counts: tracked("counts", {} as Record<string, number>),
      }));
    };
    const a = build();
    a.rows.set("r1", { n: 1, tags: new Set(["x", "y"]) });
    a.nested.set("k", new Map([["i", 2]]));
    a.list.push("one", "two");
    a.counts.hits = 3;
    const json = a.scope.snapshot();

    const b = build();
    const rowsRef = b.rows;
    b.list.push("stale");
    b.scope.restore(json);
    expect(b.rows).toBe(rowsRef);
    expect(b.rows.get("r1")).toEqual({ n: 1, tags: new Set(["x", "y"]) });
    expect(b.nested.get("k")?.get("i")).toBe(2);
    expect(b.list).toEqual(["one", "two"]);
    expect(b.counts).toEqual({ hits: 3 });
  });

  it("names a second container from the same factory in creation order", () => {
    const scope = createStateScope();
    withScope(scope, () => {
      tracked("m", new Map());
      tracked("m", new Map());
    });
    expect(scope.names()).toEqual(["m", "m#2"]);
  });
});
