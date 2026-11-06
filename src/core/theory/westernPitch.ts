/**
 * Western note names, used only to let the user pick a Reference Pitch they can match
 * to a choir, a pitch pipe or a recording. Equal temperament, A4 = 440 Hz.
 */

type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type NoteName = `${Letter}${"" | "#"}${number}`;

const SEMITONES_FROM_C: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
const PITCH_CLASSES = Object.keys(SEMITONES_FROM_C);
const NOTE_PATTERN = /^([A-G]#?)(-?\d+)$/;
const A4_MIDI = 69;
const A4_HZ = 440;

export function isNoteName(value: unknown): value is NoteName {
  return typeof value === "string" && NOTE_PATTERN.test(value);
}

function toMidi(note: NoteName): number {
  const match = NOTE_PATTERN.exec(note);
  const semitone = match ? SEMITONES_FROM_C[match[1]!] : undefined;
  if (!match || semitone === undefined) throw new Error(`Unknown note: ${note}`);
  return (Number(match[2]) + 1) * 12 + semitone;
}

function fromMidi(midi: number): NoteName {
  return `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}` as NoteName;
}

export function noteFrequency(note: NoteName): number {
  return A4_HZ * 2 ** ((toMidi(note) - A4_MIDI) / 12);
}

/** The same pitch class, `octaves` octaves higher (negative for lower). */
export function transposeNote(note: NoteName, octaves: number): NoteName {
  return fromMidi(toMidi(note) + 12 * octaves);
}

/** Every note from `low` to `high`, inclusive, by semitone. */
export function noteRange(low: NoteName, high: NoteName): NoteName[] {
  const notes: NoteName[] = [];
  for (let midi = toMidi(low); midi <= toMidi(high); midi++) notes.push(fromMidi(midi));
  return notes;
}
