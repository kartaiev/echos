import type { AudioOutput, SoundRequest } from "./AudioOutput";

/** A requested sound as it is now: volume follows setVolume(), stopped turns true on stop(). */
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
        setVolume(volume) {
          recorded.volume = volume;
        },
      };
    },
  };
  return output;
}
