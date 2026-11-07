/** What kind of sound the Practice Session is asking for ("Tone" is avoided: it means Mode in chant). */
export type SoundKind = "degree" | "ison" | "intonation";

/** Vowels the synthesized voice can sing; "ou" as in Greek ου. */
export const VOWELS = ["a", "e", "o", "ou"] as const;
export type Vowel = (typeof VOWELS)[number];

export interface SoundRequest {
  kind: SoundKind;
  frequency: number;
  /** Delay before the sound starts, for sounds sung in sequence; 0 when left out. */
  startMs?: number;
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
  /** Starts a metronome click that repeats until stopped; the first click is accented and sounds at once. */
  playClickTrack(track: ClickTrackRequest): PlayingClickTrack;
}

export interface ClickTrackRequest {
  /** Time from one click to the next. */
  intervalMs: number;
  /** Every how many clicks the accent falls, counting the first click as accented. */
  accentEvery: number;
}

/** A click track that has started. */
export interface PlayingClickTrack {
  stop(): void;
  /**
   * Time since the first click was heard, on the audio clock, so a visual count can follow the sound;
   * negative before it is heard.
   */
  elapsedMs(): number;
}

/** A sound that has started. */
export interface PlayingSound {
  /** Fades it out quickly if it is still sounding. */
  stop(): void;
  /** Changes its loudness smoothly while it sounds. */
  setVolume(volume: number): void;
}
