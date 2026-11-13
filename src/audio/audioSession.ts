/**
 * What the page tells an iPhone it does with sound, through navigator.audioSession (Safari 16.4 and later; other
 * browsers have none and ignore this). "playback" plays through the ring/silent switch, like a music app; opening
 * the microphone needs "play-and-record", which plays through the switch too. Both the sound and the microphone ask
 * here, so a tap that wakes the sound does not take the microphone away while Voice Check listens.
 */

let recording = false;

export function applyAudioSession() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  const wanted = recording ? "play-and-record" : "playback";
  if (session && session.type !== wanted) session.type = wanted;
}

/** While the microphone is open (or being opened), the session plays and records. */
export function setRecording(on: boolean) {
  recording = on;
  applyAudioSession();
}
