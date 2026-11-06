import { isNoteName, noteFrequency, noteRange, transposeNote, type NoteName } from "../theory/westernPitch";

/** The pitch the user assigns to Ni: a Western note plus a fine adjustment in hertz, before the Register applies. */
export interface ReferencePitch {
  note: NoteName;
  fineHz: number;
}

/** The female Register sounds one octave above the male one. */
export type Register = "male" | "female";

export const REGISTERS: readonly Register[] = ["male", "female"];

const REGISTER_OCTAVES: Record<Register, number> = { male: 0, female: 1 };

export const MAX_FINE_ADJUSTMENT_HZ = 5;

/** Notes offered for Ni, written in the male Register. */
export const NI_NOTE_CHOICES: readonly NoteName[] = noteRange("F2", "A3");

export interface PitchSettings {
  referencePitch: ReferencePitch;
  register: Register;
}

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  referencePitch: { note: "C3", fineHz: 0 },
  register: "male",
};

/** The note as it sounds in the given Register. */
export function soundingNote(note: NoteName, register: Register): NoteName {
  return transposeNote(note, REGISTER_OCTAVES[register]);
}

/** The frequency Ni sounds at: the note moved by the Register, then the fine adjustment as heard. */
export function niFrequency({ referencePitch, register }: PitchSettings): number {
  return noteFrequency(soundingNote(referencePitch.note, register)) + referencePitch.fineHz;
}

/** Guards settings restored from the device, which may be stale or hand-edited. */
export function isPitchSettings(value: unknown): value is PitchSettings {
  if (typeof value !== "object" || value === null) return false;
  const { referencePitch, register } = value as Record<string, unknown>;
  if (!REGISTERS.includes(register as Register)) return false;
  if (typeof referencePitch !== "object" || referencePitch === null) return false;
  const { note, fineHz } = referencePitch as Record<string, unknown>;
  return isNoteName(note) && typeof fineHz === "number" && Math.abs(fineHz) <= MAX_FINE_ADJUSTMENT_HZ;
}
