/** What kind of sound the Practice Session is asking for ("Tone" is avoided: it means Mode in chant). */
export type SoundKind = "degree" | "ison";

/** Vowels the synthesized voice can sing; "ou" as in Greek ου. */
export const VOWELS = ["a", "e", "o", "ou"] as const;
export type Vowel = (typeof VOWELS)[number];

export interface SoundRequest {
  kind: SoundKind;
  frequency: number;
  /** How long the sound lasts; null holds it until stop() is called. */
  durationMs: number | null;
  vowel: Vowel;
  /** Loudness from 0 (silent) to 1 (full). */
  volume: number;
}

/**
 * The seam between the Practice Session and real sound.
 * The browser uses Web Audio; tests use a recording fake.
 */
export interface AudioOutput {
  playSound(sound: SoundRequest): PlayingSound;
}

/** A sound that has started. */
export interface PlayingSound {
  /** Fades it out quickly if it is still sounding. */
  stop(): void;
  /** Changes its loudness smoothly while it sounds. */
  setVolume(volume: number): void;
}
