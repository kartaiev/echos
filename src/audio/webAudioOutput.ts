import type { AudioOutput, ClickTrackRequest, PlayingClickTrack, SoundRequest, Vowel } from "./AudioOutput";

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

/** Clicks are short wooden-sounding blips; the accent is higher and louder. */
const CLICK_HZ = 1320;
const ACCENT_HZ = 1760;
const CLICK_GAIN = 0.3;
const ACCENT_GAIN = 0.55;
const CLICK_DECAY_S = 0.04;
/** The first click waits a moment so its attack is not cut off. */
const FIRST_CLICK_DELAY_S = 0.05;
/**
 * Clicks are placed on the audio clock a little ahead of time, from a timer that wakes every 25 ms; timers can
 * be late, the audio clock never is. Hidden pages wake their timers about once a second, so they look further ahead.
 */
const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_S = 0.2;
const HIDDEN_LOOKAHEAD_S = 1.5;

/** One AudioContext for the whole page, created and resumed inside a user gesture, as browsers require. */
let context: AudioContext | null = null;

/**
 * iPhones mute Web Audio when the ring/silent switch is on, unless the page says it plays media. Safari 16.4 and
 * later read navigator.audioSession for that; other browsers ignore it.
 */
function playThroughSilentSwitch() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session && session.type !== "playback") session.type = "playback";
}

/**
 * When a gesture asked a stopped context to resume and it still is not running a second later, iOS has left it
 * stuck after an interruption; the next gesture then builds a fresh context.
 */
const STUCK_AFTER_MS = 1000;
/** When a gesture first asked the current context to resume without success; null while it runs. */
let resumeAskedAt: number | null = null;

/**
 * The page's AudioContext, started if it is not running. Safari stops it as "interrupted" when the student switches
 * to another app or takes a call, and as "suspended" before the first gesture; both resume here.
 */
function getContext(fromGesture = false) {
  playThroughSilentSwitch();
  if (fromGesture && context && context.state !== "running" && resumeAskedAt !== null
    && performance.now() - resumeAskedAt > STUCK_AFTER_MS) {
    void context.close().catch(() => {});
    context = null;
  }
  if (!context || context.state === "closed") {
    context = new AudioContext();
    resumeAskedAt = null;
  }
  const ctx = context;
  if (ctx.state === "running") {
    resumeAskedAt = null;
  } else {
    if (fromGesture) resumeAskedAt ??= performance.now();
    ctx.resume().then(
      () => {
        if (ctx === context && ctx.state === "running") resumeAskedAt = null;
      },
      () => {},
    );
  }
  return ctx;
}

let unlockListening = false;

/**
 * Touch browsers only let audio start inside a gesture, and a long press starts the Ison from a timer, outside one.
 * So every touch, click or key wakes the context: a sound started while it slept begins on the finger's lift, and
 * the first touch after returning from another app brings the sound back. Coming back to the page tries too.
 */
function listenForUnlock() {
  if (unlockListening) return;
  unlockListening = true;
  for (const type of ["pointerdown", "pointerup", "touchend", "keydown"]) {
    window.addEventListener(type, () => getContext(true), { capture: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && context) getContext();
  });
}

function scheduleClick(ctx: AudioContext, output: AudioNode, at: number, accent: boolean) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = accent ? ACCENT_HZ : CLICK_HZ;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(accent ? ACCENT_GAIN : CLICK_GAIN, at + 0.002);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + CLICK_DECAY_S);
  osc.connect(envelope).connect(output);
  osc.start(at);
  osc.stop(at + CLICK_DECAY_S + 0.01);
}

/** The metronome: its own output node, so it never touches the voices that sound beside it. */
function playClickTrack({ intervalMs, accentEvery }: ClickTrackRequest): PlayingClickTrack {
  const ctx = getContext();
  const interval = intervalMs / 1000;
  const first = ctx.currentTime + FIRST_CLICK_DELAY_S;
  const output = ctx.createGain();
  output.connect(ctx.destination);
  let index = 0;

  function schedule() {
    const horizon = ctx.currentTime + (document.hidden ? HIDDEN_LOOKAHEAD_S : LOOKAHEAD_S);
    // Each click time is counted from the first, so small timer delays never add up to drift.
    for (let at = first + index * interval; at < horizon; at = first + index * interval) {
      scheduleClick(ctx, output, at, index % accentEvery === 0);
      index += 1;
    }
  }

  schedule();
  const timer = setInterval(schedule, SCHEDULER_INTERVAL_MS);
  let stopped = false;

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      // Silence clicks already placed ahead, then let go of the node.
      const now = ctx.currentTime;
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.linearRampToValueAtTime(0, now + 0.01);
      setTimeout(() => output.disconnect(), (HIDDEN_LOOKAHEAD_S + 0.1) * 1000);
    },
    elapsedMs() {
      // What is heard now left the audio clock one output latency ago.
      const latency = ctx.outputLatency || ctx.baseLatency || 0;
      return (ctx.currentTime - latency - first) * 1000;
    },
  };
}

/** Real sound in the browser. */
export function createWebAudioOutput(): AudioOutput {
  listenForUnlock();

  return {
    playClickTrack,
    // Before anything has been played there is nothing to hear yet, so nothing is held back either.
    isRunning: () => context === null || context.state === "running",
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
