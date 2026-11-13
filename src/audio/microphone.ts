import { setRecording } from "./audioSession";
import { detectPitch } from "./pitchDetection";

/** How often the voice is read: often enough to follow a sung line, rarely enough to spare a phone's battery. */
const READ_EVERY_MS = 50;
/** About 43 ms at 48 kHz: two periods of a bass's lowest note. */
const FRAME = 2048;

/** The microphone as Voice Check wants it; a device that cannot set these up gets its plain microphone. */
async function openMicrophone(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") throw error;
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

export interface Listening {
  stop(): void;
}

/**
 * Listens to the microphone and reports the pitch of the voice (null between notes) until stopped. Echo
 * cancellation keeps the page's own Ison out where the device can; noise suppression and automatic gain are off,
 * since both bend a held note. Rejects when the student refuses the microphone or the device has none.
 */
export async function listenToVoice(onPitch: (hz: number | null) => void): Promise<Listening> {
  // An iPhone opens no microphone while the page only plays.
  setRecording(true);
  // Made before the first await, while the tap that asked for it still counts as a gesture.
  const context = new AudioContext();
  let stream: MediaStream;
  try {
    stream = await openMicrophone();
  } catch (error) {
    void context.close();
    setRecording(false);
    throw error;
  }
  await context.resume().catch(() => {});
  const analyser = context.createAnalyser();
  analyser.fftSize = FRAME;
  context.createMediaStreamSource(stream).connect(analyser);
  const frame = new Float32Array(FRAME);
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(frame);
    onPitch(detectPitch(frame, context.sampleRate));
  }, READ_EVERY_MS);
  return {
    stop() {
      window.clearInterval(timer);
      for (const track of stream.getTracks()) track.stop();
      void context.close();
      setRecording(false);
    },
  };
}
