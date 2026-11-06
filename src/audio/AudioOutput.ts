/** What kind of sound the Practice Session is asking for. */
export type ToneKind = "degree";

export interface ToneRequest {
  kind: ToneKind;
  frequency: number;
  durationMs: number;
}

/**
 * The seam between the Practice Session and real sound.
 * The browser uses Web Audio; tests use a recording fake.
 */
export interface AudioOutput {
  playTone(tone: ToneRequest): void;
}
