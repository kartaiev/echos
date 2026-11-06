import { DEGREE_NAMES, type DegreeName, type GenusId, type TuningSystem } from "./tuningSystems";

/** A Degree in a given octave: 0 is the octave of the Reference Pitch, -1 below it, 1 above. */
export interface DegreePosition {
  name: DegreeName;
  octave: number;
}

export interface ScaleDegree extends DegreePosition {
  /** Degree name with an octave mark: a comma per octave below Ni ("Ke,"), an apostrophe per octave above ("Ni'"). */
  id: string;
  /** Distance from the Reference Pitch (Ni) in moria; negative below it. */
  moria: number;
  frequency: number;
}

export interface ScaleOptions {
  tuningSystem: TuningSystem;
  genus: GenusId;
  referencePitchHz: number;
  lowest: DegreePosition;
  highest: DegreePosition;
}

function degreeIndex({ name, octave }: DegreePosition): number {
  return octave * DEGREE_NAMES.length + DEGREE_NAMES.indexOf(name);
}

export function degreeId({ name, octave }: DegreePosition): string {
  return name + (octave < 0 ? ",".repeat(-octave) : "'".repeat(octave));
}

/** Positions in moria from Ni of every Degree index from `lowest` to `highest` (Ni of octave 0 is index 0). */
function positions(intervals: readonly number[], from: DegreeName, lowest: number, highest: number): Map<number, number> {
  const start = DEGREE_NAMES.indexOf(from);
  const intervalAbove = (index: number) => intervals[(((index - start) % intervals.length) + intervals.length) % intervals.length]!;
  const moria = new Map([[0, 0]]);
  for (let index = 0; index < highest; index++) moria.set(index + 1, moria.get(index)! + intervalAbove(index));
  for (let index = 0; index > lowest; index--) moria.set(index - 1, moria.get(index)! - intervalAbove(index - 1));
  return moria;
}

/** The Degrees of a Scale from `lowest` to `highest`, each with its position in moria and its frequency. */
export function buildScale({ tuningSystem, genus, referencePitchHz, lowest, highest }: ScaleOptions): ScaleDegree[] {
  const { from, intervals } = tuningSystem.genera[genus].value;
  const [low, high] = [degreeIndex(lowest), degreeIndex(highest)];
  const moriaAt = positions(intervals, from, low, high);
  const degrees: ScaleDegree[] = [];
  for (let index = low; index <= high; index++) {
    const octave = Math.floor(index / DEGREE_NAMES.length);
    const position = { name: DEGREE_NAMES[index - octave * DEGREE_NAMES.length]!, octave };
    const moria = moriaAt.get(index)!;
    degrees.push({
      ...position,
      id: degreeId(position),
      moria,
      frequency: referencePitchHz * 2 ** (moria / tuningSystem.moriaPerOctave),
    });
  }
  return degrees;
}
