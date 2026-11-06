/** What kind of sound the Practice Session is asking for ("Tone" is avoided: it means Mode in chant). */
export type SoundKind = "degree";

export interface SoundRequest {
  kind: SoundKind;
  frequency: number;
  durationMs: number;
}

/**
 * The seam between the Practice Session and real sound.
 * The browser uses Web Audio; tests use a recording fake.
 */
export interface AudioOutput {
  playSound(sound: SoundRequest): void;
}
