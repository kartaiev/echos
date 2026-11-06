import type { AudioOutput } from "../../audio/AudioOutput";
import { buildScale } from "../theory/scale";
import { PMC_1881, type DegreeName } from "../theory/tuningSystems";

const DEFAULT_REFERENCE_PITCH_HZ = 130.81;
const DEGREE_DURATION_MS = 1200;

export interface PracticeSessionOptions {
  audio: AudioOutput;
}

export interface LadderDegree {
  id: string;
  name: DegreeName;
  octave: number;
  /** Distance from Ni in moria; the UI spaces Degrees in proportion to it. */
  moria: number;
  /** Size of the interval to the Degree above, or null for the top Degree. */
  moriaToNext: number | null;
}

export interface Ladder {
  degrees: LadderDegree[];
  totalMoria: number;
  tuningSystemName: string;
  source: string;
}

export type PracticeSession = ReturnType<typeof createPracticeSession>;

export function createPracticeSession({ audio }: PracticeSessionOptions) {
  const tuningSystem = PMC_1881;
  const genus = "diatonic";
  const scale = buildScale({ tuningSystem, genus, referencePitchHz: DEFAULT_REFERENCE_PITCH_HZ });

  return {
    ladder(): Ladder {
      const degrees = scale.map((d, i) => {
        const next = scale[i + 1];
        return { id: d.id, name: d.name, octave: d.octave, moria: d.moria, moriaToNext: next ? next.moria - d.moria : null };
      });
      return {
        degrees,
        totalMoria: scale[scale.length - 1]!.moria - scale[0]!.moria,
        tuningSystemName: tuningSystem.name,
        source: tuningSystem.genera[genus].source,
      };
    },
    playDegree(degreeId: string) {
      const degree = scale.find((d) => d.id === degreeId);
      if (!degree) throw new Error(`Unknown Degree: ${degreeId}`);
      audio.playTone({ kind: "degree", frequency: degree.frequency, durationMs: DEGREE_DURATION_MS });
    },
  };
}
