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
  /** Degrees moved off their place in the Genus, in moria, in every octave. */
  shifts?: readonly { name: DegreeName; moria: number }[];
  /**
   * A Degree held at a given position, the whole Scale moved with it: the pivot of a Fthora keeps its pitch and
   * the new Genus is laid around it.
   */
  pivot?: { degree: DegreePosition; moria: number };
}

/** The place of a Degree counted in Degrees from Ni of octave 0. */
export function degreeIndex({ name, octave }: DegreePosition): number {
  return octave * DEGREE_NAMES.length + DEGREE_NAMES.indexOf(name);
}

export function positionAt(index: number): DegreePosition {
  const octave = Math.floor(index / DEGREE_NAMES.length);
  return { name: DEGREE_NAMES[index - octave * DEGREE_NAMES.length]!, octave };
}

/** The Degree of that name nearest to a place, so that a pivot renamed by a Fthora moves no more than it must. */
export function nearestPosition(name: DegreeName, index: number): DegreePosition {
  const octave = Math.round((index - DEGREE_NAMES.indexOf(name)) / DEGREE_NAMES.length);
  return { name, octave };
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
export function buildScale({ tuningSystem, genus, referencePitchHz, lowest, highest, shifts = [], pivot }: ScaleOptions): ScaleDegree[] {
  const { from, intervals } = tuningSystem.genera[genus].value;
  const [low, high] = [degreeIndex(lowest), degreeIndex(highest)];
  const pivotIndex = pivot ? degreeIndex(pivot.degree) : 0;
  const moriaAt = positions(intervals, from, Math.min(low, pivotIndex), Math.max(high, pivotIndex));
  const offset = pivot ? pivot.moria - moriaAt.get(pivotIndex)! : 0;
  const degrees: ScaleDegree[] = [];
  for (let index = low; index <= high; index++) {
    const position = positionAt(index);
    const shift = shifts.find(({ name }) => name === position.name);
    const moria = moriaAt.get(index)! + offset + (shift?.moria ?? 0);
    degrees.push({
      ...position,
      id: degreeId(position),
      moria,
      frequency: referencePitchHz * 2 ** (moria / tuningSystem.moriaPerOctave),
    });
  }
  return degrees;
}
