import type { AudioOutput, SoundRequest } from "./AudioOutput";

/** Audio output for tests: records every requested sound instead of playing it. */
export function createRecordingAudioOutput() {
  const sounds: SoundRequest[] = [];
  const output: AudioOutput & { sounds: SoundRequest[] } = {
    sounds,
    playSound(sound) {
      sounds.push(sound);
    },
  };
  return output;
}
