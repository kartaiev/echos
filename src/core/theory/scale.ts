import { DEGREE_NAMES, type DegreeName, type GenusId, type TuningSystem } from "./tuningSystems";

export interface ScaleDegree {
  /** Degree name plus octave mark: "Ni", "Pa", ... "Ni'" (one octave up). */
  id: string;
  name: DegreeName;
  /** 0 is the octave of the Reference Pitch, 1 the octave above. */
  octave: number;
  /** Distance from the Reference Pitch (Ni) in moria. */
  moria: number;
  frequency: number;
}

export interface ScaleOptions {
  tuningSystem: TuningSystem;
  genus: GenusId;
  referencePitchHz: number;
}

/** One octave of a Scale, from Ni to Ni', with every Degree's position and frequency. */
export function buildScale({ tuningSystem, genus, referencePitchHz }: ScaleOptions): ScaleDegree[] {
  const intervals = tuningSystem.genera[genus].value;
  const degrees: ScaleDegree[] = [];
  let moria = 0;
  for (let step = 0; step <= intervals.length; step++) {
    const octave = Math.floor(step / DEGREE_NAMES.length);
    const name = DEGREE_NAMES[step % DEGREE_NAMES.length]!;
    degrees.push({
      id: name + "'".repeat(octave),
      name,
      octave,
      moria,
      frequency: referencePitchHz * 2 ** (moria / tuningSystem.moriaPerOctave),
    });
    moria += intervals[step] ?? 0;
  }
  return degrees;
}
