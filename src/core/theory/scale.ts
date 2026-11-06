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

function degreeId({ name, octave }: DegreePosition): string {
  return name + (octave < 0 ? ",".repeat(-octave) : "'".repeat(octave));
}

/** The Degrees of a Scale from `lowest` to `highest`, each with its position in moria and its frequency. */
export function buildScale({ tuningSystem, genus, referencePitchHz, lowest, highest }: ScaleOptions): ScaleDegree[] {
  const intervals = tuningSystem.genera[genus].value;
  const moriaAboveNi = intervals.map((_, i) => intervals.slice(0, i).reduce((sum, size) => sum + size, 0));
  const degrees: ScaleDegree[] = [];
  for (let index = degreeIndex(lowest); index <= degreeIndex(highest); index++) {
    const octave = Math.floor(index / DEGREE_NAMES.length);
    const withinOctave = index - octave * DEGREE_NAMES.length;
    const position = { name: DEGREE_NAMES[withinOctave]!, octave };
    const moria = octave * tuningSystem.moriaPerOctave + moriaAboveNi[withinOctave]!;
    degrees.push({
      ...position,
      id: degreeId(position),
      moria,
      frequency: referencePitchHz * 2 ** (moria / tuningSystem.moriaPerOctave),
    });
  }
  return degrees;
}
