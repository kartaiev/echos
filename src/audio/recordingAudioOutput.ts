import type { AudioOutput, ToneRequest } from "./AudioOutput";

/** Audio output for tests: records every requested tone instead of playing it. */
export function createRecordingAudioOutput() {
  const tones: ToneRequest[] = [];
  const output: AudioOutput & { tones: ToneRequest[] } = {
    tones,
    playTone(tone) {
      tones.push(tone);
    },
  };
  return output;
}
