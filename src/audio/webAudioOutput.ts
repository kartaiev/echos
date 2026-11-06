import type { AudioOutput, SoundRequest } from "./AudioOutput";

/** Formants of a sung "a" (Hz, gain, Q); a rough vocal colour, not a real voice. */
const VOWEL_A = [
  { frequency: 730, gain: 1.0, q: 8 },
  { frequency: 1090, gain: 0.5, q: 10 },
  { frequency: 2440, gain: 0.18, q: 12 },
];

const ATTACK_S = 0.06;
const RELEASE_S = 0.25;
const PEAK_GAIN = 0.35;
/** Fade-out when a sound is cut off by the next one. */
const CUT_OFF_S = 0.03;

/** Real sound in the browser. The AudioContext is created on the first sound, inside a user gesture. */
export function createWebAudioOutput(): AudioOutput {
  let context: AudioContext | null = null;

  function getContext() {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  }

  return {
    playSound(sound: SoundRequest) {
      const ctx = getContext();
      const start = ctx.currentTime;
      const end = start + sound.durationMs / 1000;

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
      envelope.gain.setValueAtTime(PEAK_GAIN, end);
      envelope.gain.linearRampToValueAtTime(0, end + RELEASE_S);
      envelope.connect(ctx.destination);

      for (const formant of VOWEL_A) {
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = formant.frequency;
        filter.Q.value = formant.q;
        const gain = ctx.createGain();
        gain.gain.value = formant.gain;
        source.connect(filter).connect(gain).connect(envelope);
      }

      source.start(start);
      vibrato.start(start);
      source.stop(end + RELEASE_S);
      vibrato.stop(end + RELEASE_S);

      return {
        stop() {
          const now = ctx.currentTime;
          if (now >= end + RELEASE_S) return;
          // Hold the current level, then fade out fast enough to avoid overlap but slow enough to avoid a click.
          envelope.gain.cancelScheduledValues(now);
          envelope.gain.setValueAtTime(envelope.gain.value, now);
          envelope.gain.linearRampToValueAtTime(0, now + CUT_OFF_S);
          source.stop(now + CUT_OFF_S);
          vibrato.stop(now + CUT_OFF_S);
        },
      };
    },
  };
}
