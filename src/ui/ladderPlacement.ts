/**
 * Both sides: the keys stand at their moria and alternate around the rail, so the distance between keys is the
 * interval. One side: the keys stand in one column (or row) at equal steps, roomy even where an interval is 4
 * moria, and a line joins each key to its true place on the rail, which keeps the moria.
 */
export const LADDER_SIDES = ["both", "one"] as const;
export type LadderSides = (typeof LADDER_SIDES)[number];

export const isLadderSides = (value: unknown): value is LadderSides => LADDER_SIDES.includes(value as LadderSides);

export interface KeyPlace {
  /** Where the key stands along the ladder, from 0 (lowest) to 1 (highest). */
  key: number;
  /** Where the Degree is on the rail, in proportion to moria, on the same scale. */
  rail: number;
  /** First is left of the rail (or below it, on a keyboard); second is right (or above). */
  side: "first" | "second";
}

export function placeKeys(
  moria: readonly number[],
  range: { lowestMoria: number; highestMoria: number },
  sides: LadderSides,
): KeyPlace[] {
  const share = (m: number) => (m - range.lowestMoria) / (range.highestMoria - range.lowestMoria);
  const steps = moria.length - 1;
  return moria.map((m, i) =>
    sides === "both"
      ? { key: share(m), rail: share(m), side: i % 2 === 0 ? "first" : "second" }
      : { key: steps === 0 ? 0.5 : i / steps, rail: share(m), side: "second" },
  );
}
