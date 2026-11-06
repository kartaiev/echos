import type { AudioOutput, PlayingSound } from "../../audio/AudioOutput";
import { buildScale } from "../theory/scale";
import { PMC_1881, type DegreeName, type GenusId, type TuningSystemId } from "../theory/tuningSystems";
import { noteFrequency, type NoteName } from "../theory/westernPitch";

const DEGREE_DURATION_MS = 1200;

/** The frequency assigned to Ni, as a Western note plus a fine adjustment in hertz. */
export interface ReferencePitch {
  note: NoteName;
  fineHz: number;
}

/** The female register sounds one octave above the male one. */
export type Register = "male" | "female";

export interface PitchSettings {
  referencePitch: ReferencePitch;
  register: Register;
}

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  referencePitch: { note: "C3", fineHz: 0 },
  register: "male",
};

export const REGISTER_OCTAVES: Record<Register, number> = { male: 0, female: 1 };

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
  const genus: GenusId = "diatonic";
  let settings = pitchSettings;
  let currentDegreeSound: PlayingSound | null = null;

  const niHz = () =>
    (noteFrequency(settings.referencePitch.note) + settings.referencePitch.fineHz) * 2 ** REGISTER_OCTAVES[settings.register];
  let scale = buildScale({ tuningSystem, genus, referencePitchHz: niHz() });

  function updateSettings(next: PitchSettings) {
    settings = next;
    scale = buildScale({ tuningSystem, genus, referencePitchHz: niHz() });
  }

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
    pitchSettings(): PitchSettings & { niHz: number } {
      return { ...settings, niHz: niHz() };
    },
    setReferencePitch(referencePitch: ReferencePitch) {
      updateSettings({ ...settings, referencePitch });
    },
    setRegister(register: Register) {
      updateSettings({ ...settings, register });
    },
    playDegree(degreeId: string) {
      const degree = scale.find((d) => d.id === degreeId);
      if (!degree) throw new Error(`Unknown Degree: ${degreeId}`);
      currentDegreeSound?.stop();
      currentDegreeSound = audio.playSound({ kind: "degree", frequency: degree.frequency, durationMs: DEGREE_DURATION_MS });
    },
  };
}
