import type { AudioOutput, SoundRequest } from "./AudioOutput";

export interface RecordedSound extends SoundRequest {
  stopped: boolean;
}

/** Audio output for tests: records every requested sound instead of playing it. */
export function createRecordingAudioOutput() {
  const sounds: RecordedSound[] = [];
  const output: AudioOutput & { sounds: RecordedSound[] } = {
    sounds,
    playSound(sound) {
      const recorded = { ...sound, stopped: false };
      sounds.push(recorded);
      return {
        stop() {
          recorded.stopped = true;
        },
      };
    },
  };
  return output;
}
