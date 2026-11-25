/**
 * What the page tells an iPhone it does with sound, through navigator.audioSession (Safari 16.4 and later; other
 * browsers have none and ignore this). "playback" plays through the ring/silent switch, like a music app; opening
 * the microphone needs "play-and-record", which plays through the switch too. Both the sound and the microphone ask
 * here, so a tap that wakes the sound does not take the microphone away while Voice Check listens.
 */

export interface PageAudioSession extends EventTarget {
  type: string;
  /** "active", "inactive" or "interrupted" (another app, a call). */
  readonly state?: string;
}

let recording = false;

export function audioSession(): PageAudioSession | undefined {
  return (navigator as Navigator & { audioSession?: PageAudioSession }).audioSession;
}

export function applyAudioSession() {
  const session = audioSession();
  const wanted = recording ? "play-and-record" : "playback";
  if (session && session.type !== wanted) session.type = wanted;
}

/**
 * Asks for the session afresh: after another app has taken the sound, the page's session can stay interrupted, and
 * every context the page makes then plays into nothing. Setting the type anew makes Safari set the session up again.
 */
export function renewAudioSession() {
  const session = audioSession();
  if (!session) return;
  session.type = "auto";
  applyAudioSession();
}

/** While the microphone is open (or being opened), the session plays and records. */
export function setRecording(on: boolean) {
  recording = on;
  applyAudioSession();
}
