import { describe, expect, it } from "vitest";
import { isLadderSides, placeKeys } from "./ladderPlacement";

// Hard Chromatic from low Ke: the tightest steps in the tables, 4 moria between Vou and Ga.
const moria = [0, 10, 18, 24, 44, 48, 60, 72, 82, 90];
const range = { lowestMoria: 0, highestMoria: 90 };

describe("Placing the keys of the Ladder", () => {
  it("on both sides: each key stands at its own moria, alternating sides of the rail", () => {
    const places = placeKeys(moria, range, "both");

    expect(places.map((p) => p.key)).toEqual(moria.map((m) => m / 90));
    expect(places.map((p) => p.rail)).toEqual(moria.map((m) => m / 90));
    expect(places.map((p) => p.side)).toEqual(["first", "second", "first", "second", "first", "second", "first", "second", "first", "second"]);
  });

  it("on one side: the keys stand at equal steps, all on one side, and the rail keeps the true moria", () => {
    const places = placeKeys(moria, range, "one");

    expect(places.map((p) => p.key)).toEqual(moria.map((_, i) => i / 9));
    expect(places.map((p) => p.rail)).toEqual(moria.map((m) => m / 90));
    expect(new Set(places.map((p) => p.side))).toEqual(new Set(["second"]));
  });

  it("on one side, the 4 moria between Vou and Ga get the same room as every other step", () => {
    const places = placeKeys(moria, range, "one");
    const gaps = places.slice(1).map((p, i) => p.key - places[i]!.key);

    for (const gap of gaps) expect(gap).toBeCloseTo(1 / 9);
  });

  it("on one side, a single key stands in the middle", () => {
    expect(placeKeys([30], { lowestMoria: 0, highestMoria: 60 }, "one")).toEqual([{ key: 0.5, rail: 0.5, side: "second" }]);
  });

  it("remembers only the two known choices", () => {
    expect(isLadderSides("both")).toBe(true);
    expect(isLadderSides("one")).toBe(true);
    expect(isLadderSides("left")).toBe(false);
    expect(isLadderSides(null)).toBe(false);
  });
});
