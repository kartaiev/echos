import type { AudioOutput, ClickTrackRequest, SoundRequest } from "./AudioOutput";

/** A requested sound as it is now: volume follows setVolume(), stopped turns true on stop(). */
export interface RecordedSound extends SoundRequest {
  stopped: boolean;
}

/** A requested click track; tests set elapsedMs to say how far the clicks have been heard. */
export interface RecordedClickTrack extends ClickTrackRequest {
  stopped: boolean;
  elapsedMs: number;
}

/** Audio output for tests: records every requested sound instead of playing it. */
export function createRecordingAudioOutput() {
  const sounds: RecordedSound[] = [];
  const clickTracks: RecordedClickTrack[] = [];
  const output: AudioOutput & { sounds: RecordedSound[]; clickTracks: RecordedClickTrack[]; running: boolean } = {
    sounds,
    clickTracks,
    /** Tests set this to false to play a device that holds the sound back. */
    running: true,
    isRunning() {
      return output.running;
    },
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
    playClickTrack(track) {
      const recorded = { ...track, stopped: false, elapsedMs: 0 };
      clickTracks.push(recorded);
      return {
        stop() {
          recorded.stopped = true;
        },
        elapsedMs: () => recorded.elapsedMs,
      };
    },
  };
  return output;
}
