import type { AudioOutput, PlayingSound } from "../../audio/AudioOutput";
import { buildScale, type DegreePosition } from "../theory/scale";
import { PMC_1881, type DegreeName, type GenusId, type TuningSystemId } from "../theory/tuningSystems";
import { DEFAULT_PITCH_SETTINGS, niFrequency, soundingNote, type PitchSettings } from "./pitchSettings";
import type { NoteName } from "../theory/westernPitch";

export type { PitchSettings, ReferencePitch, Register } from "./pitchSettings";

const DEGREE_DURATION_MS = 1200;

/** The ladder covers the range most Modes use: low Ke to high Ga'. */
const LADDER_LOWEST: DegreePosition = { name: "Ke", octave: -1 };
const LADDER_HIGHEST: DegreePosition = { name: "Ga", octave: 1 };

/** Pitch settings plus what they mean in sound, for display. */
export interface PitchState extends PitchSettings {
  /** The note Ni sounds at in the current Register, before fine adjustment. */
  niNote: NoteName;
  niHz: number;
}

export interface PracticeSessionOptions {
  audio: AudioOutput;
  /** Settings restored from the device; defaults to Ni = C3, male register. */
  pitchSettings?: PitchSettings;
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
  genus: GenusId;
  /** Moria from the lowest to the highest Degree on the ladder; the UI spaces Degrees by it. */
  totalMoria: number;
  tuningSystemId: TuningSystemId;
  moriaPerOctave: number;
  /** Bibliographic citation of the interval values; shown as written, not translated. */
  source: string;
}

export type PracticeSession = ReturnType<typeof createPracticeSession>;

export function createPracticeSession({ audio, pitchSettings = DEFAULT_PITCH_SETTINGS }: PracticeSessionOptions) {
  const tuningSystem = PMC_1881;
  let genus: GenusId = "diatonic";
  let settings = pitchSettings;
  let currentDegreeSound: PlayingSound | null = null;

  const buildCurrentScale = () =>
    buildScale({ tuningSystem, genus, referencePitchHz: niFrequency(settings), lowest: LADDER_LOWEST, highest: LADDER_HIGHEST });
  let scale = buildCurrentScale();

  return {
    ladder(): Ladder {
      const degrees = scale.map((d, i) => {
        const next = scale[i + 1];
        return { id: d.id, name: d.name, octave: d.octave, moria: d.moria, moriaToNext: next ? next.moria - d.moria : null };
      });
      return {
        degrees,
        genus,
        totalMoria: scale[scale.length - 1]!.moria - scale[0]!.moria,
        tuningSystemId: tuningSystem.id,
        moriaPerOctave: tuningSystem.moriaPerOctave,
        source: tuningSystem.genera[genus].source,
      };
    },
    pitchSettings(): PitchState {
      return { ...settings, niNote: soundingNote(settings.referencePitch.note, settings.register), niHz: niFrequency(settings) };
    },
    /** Change the Reference Pitch and/or Register; the next Degree played sounds at the new pitch. */
    setPitchSettings(change: Partial<PitchSettings>) {
      settings = { ...settings, ...change };
      scale = buildCurrentScale();
    },
    /** Switch the Scale to another Genus; the next Degree played sounds in it. */
    setGenus(next: GenusId) {
      genus = next;
      scale = buildCurrentScale();
    },
    playDegree(degreeId: string) {
      const degree = scale.find((d) => d.id === degreeId);
      if (!degree) throw new Error(`Unknown Degree: ${degreeId}`);
      currentDegreeSound?.stop();
      currentDegreeSound = audio.playSound({ kind: "degree", frequency: degree.frequency, durationMs: DEGREE_DURATION_MS });
    },
  };
}
