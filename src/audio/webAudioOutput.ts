import type { AudioOutput, SoundRequest, Vowel } from "./AudioOutput";

interface Formant {
  frequency: number;
  gain: number;
  q: number;
}

/**
 * Formants of sung vowels (Hz), after the adult male averages of Peterson & Barney (1952).
 * A rough vocal colour, not a real voice.
 */
const FORMANTS: Record<Vowel, Formant[]> = {
  a: [
    { frequency: 730, gain: 1.0, q: 8 },
    { frequency: 1090, gain: 0.5, q: 10 },
    { frequency: 2440, gain: 0.18, q: 12 },
  ],
  e: [
    { frequency: 530, gain: 1.0, q: 8 },
    { frequency: 1840, gain: 0.4, q: 10 },
    { frequency: 2480, gain: 0.2, q: 12 },
  ],
  o: [
    { frequency: 570, gain: 1.0, q: 8 },
    { frequency: 840, gain: 0.55, q: 10 },
    { frequency: 2410, gain: 0.12, q: 12 },
  ],
  ou: [
    { frequency: 300, gain: 1.0, q: 7 },
    { frequency: 870, gain: 0.35, q: 10 },
    { frequency: 2240, gain: 0.08, q: 12 },
  ],
};

const ATTACK_S = 0.06;
const RELEASE_S = 0.25;
const PEAK_GAIN = 0.35;
/** Fade-out when a sound is cut off by the next one. */
const CUT_OFF_S = 0.03;
/** How quickly a volume change settles (time constant). */
const VOLUME_GLIDE_S = 0.05;

/** One AudioContext for the whole page, created and resumed inside a user gesture, as browsers require. */
let context: AudioContext | null = null;

function getContext() {
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

let unlockListening = false;

/**
 * A long press starts the Ison from a timer, outside any gesture. Touch browsers only allow audio on the
 * gesture that lifts the finger, so audio is also unlocked then: a sound started while suspended begins on lift.
 */
function listenForUnlock() {
  if (unlockListening) return;
  unlockListening = true;
  for (const type of ["pointerdown", "pointerup", "touchend", "keydown"]) {
    window.addEventListener(type, getContext, { capture: true });
  }
}

/** Real sound in the browser. */
export function createWebAudioOutput(): AudioOutput {
  listenForUnlock();

  return {
    playSound(sound: SoundRequest) {
      const ctx = getContext();
      const start = ctx.currentTime + (sound.startMs ?? 0) / 1000;
      const end = sound.durationMs === null ? null : start + sound.durationMs / 1000;

      const source = ctx.createOscillator();
      source.type = "sawtooth";
      source.frequency.value = sound.frequency;

      // Gentle vibrato so the voice sounds sung rather than electronic.
      const vibrato = ctx.createOscillator();
      const vibratoDepth = ctx.createGain();
      vibrato.frequency.value = 5;
      vibratoDepth.gain.value = sound.frequency * 0.004;
      vibrato.connect(vibratoDepth).connect(source.frequency);

      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(PEAK_GAIN, start + ATTACK_S);
      if (end !== null) {
        envelope.gain.setValueAtTime(PEAK_GAIN, end);
        envelope.gain.linearRampToValueAtTime(0, end + RELEASE_S);
      }
      envelope.connect(ctx.destination);

      const loudness = ctx.createGain();
      loudness.gain.value = sound.volume;
      loudness.connect(envelope);

      for (const formant of FORMANTS[sound.vowel]) {
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = formant.frequency;
        filter.Q.value = formant.q;
        const gain = ctx.createGain();
        gain.gain.value = formant.gain;
        source.connect(filter).connect(gain).connect(loudness);
      }

      source.start(start);
      vibrato.start(start);
      if (end !== null) {
        source.stop(end + RELEASE_S);
        vibrato.stop(end + RELEASE_S);
      }

      const finished = () => end !== null && ctx.currentTime >= end + RELEASE_S;
      let stopped = false;

      return {
        stop() {
          if (stopped || finished()) return;
          stopped = true;
          const now = ctx.currentTime;
          // Hold the current level, then fade out fast enough to avoid overlap but slow enough to avoid a click.
          envelope.gain.cancelScheduledValues(now);
          envelope.gain.setValueAtTime(envelope.gain.value, now);
          envelope.gain.linearRampToValueAtTime(0, now + CUT_OFF_S);
          source.stop(now + CUT_OFF_S);
          vibrato.stop(now + CUT_OFF_S);
        },
        setVolume(volume: number) {
          if (stopped || finished()) return;
          loudness.gain.setTargetAtTime(volume, ctx.currentTime, VOLUME_GLIDE_S);
        },
      };
    },
  };
}
